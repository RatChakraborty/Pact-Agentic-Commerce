import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from .config import settings
from .domain import NewAgreement, Approval, Evidence, Review, Negotiate, now
from .store import transaction, save, audit
from .agents import negotiate, NegotiationError
from .verification import verify
from .paypal import paypal, ProviderError

app=FastAPI(title='Pact',version='0.1.0')
# A local random fallback invalidates sessions at restart; deployments must set a persistent secret.
app.add_middleware(SessionMiddleware,secret_key=settings.app_session_secret or secrets.token_urlsafe(48),same_site='strict',https_only=False)

@app.middleware('http')
async def protections(request,call_next):
    if request.method in {'POST','PUT','PATCH','DELETE'}:
        origin=request.headers.get('origin')
        if origin and origin != str(request.base_url).rstrip('/'):
            return JSONResponse({'detail':'Cross-origin mutation blocked.'},status_code=403)
        if request.headers.get('content-length','0').isdigit() and int(request.headers.get('content-length','0'))>120000:
            return JSONResponse({'detail':'Request exceeds artifact size limit.'},status_code=413)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    response.headers['Cache-Control']='no-store'
    return response

def owner(request:Request):
    if 'owner' not in request.session: request.session['owner']=secrets.token_urlsafe(24)
    if request.method!='GET' and request.headers.get('x-pact-action')!='1':
        raise HTTPException(403,'Missing action protection.')
    return request.session['owner']

def load(db,id,user):
    row=db.execute('SELECT * FROM agreements WHERE id=? AND owner=?',(id,user)).fetchone()
    if not row: raise HTTPException(404,'Agreement not found in this browser session.')
    return json.loads(row['data'])

def require(a,*states):
    if a['status'] not in states: raise HTTPException(409,'This action is unavailable at the current step.')

def change(db,a,status,action,details=None):
    prior=a['status']; a['status']=status; audit(db,a,action,prior,details); save(db,a)

def check_approval(a,data):
    if data.version!=a['version']: raise HTTPException(409,'Agreement version changed; review the current terms.')

@app.exception_handler(ProviderError)
def provider_error(request,exc):
    return JSONResponse({'detail':str(exc)},status_code=502)

@app.get('/api/health')
def health():
    with transaction() as db: db.execute('SELECT 1')
    return {'status':'ok','paypal_environment':'sandbox','paypal_configured':bool(settings.paypal_client_id and settings.paypal_client_secret and settings.paypal_env=='sandbox'),'live_ai_configured':bool(settings.llm_api_key and settings.llm_model)}

@app.get('/api/agreements')
def listing(user=Depends(owner)):
    with transaction() as db:
        return [json.loads(r['data']) for r in db.execute('SELECT data FROM agreements WHERE owner=? ORDER BY rowid DESC',(user,))]

@app.post('/api/agreements',status_code=201)
def create(data:NewAgreement,user=Depends(owner)):
    if data.deadline<=datetime.now(timezone.utc): raise HTTPException(422,'Choose a future delivery deadline.')
    if data.buyer_email==data.seller_email: raise HTTPException(422,'Buyer and merchant must be different sandbox accounts.')
    if data.seller_floor_minor>data.asking_minor: raise HTTPException(422,'Seller minimum exceeds asking price.')
    a={'id':str(uuid4()),**data.model_dump(mode='json'),'version':1,'status':'DRAFT','currency':'USD','amount_minor':None,'offers':[],'invoice':None,'verification':None,'accepted_at':None,'approved_at':None,'created_at':now()}
    with transaction() as db:
        count=db.execute('SELECT COUNT(*) FROM agreements WHERE owner=?',(user,)).fetchone()[0]
        if count>=30: raise HTTPException(429,'Local demo agreement limit reached.')
        db.execute('INSERT INTO agreements VALUES(?,?,?)',(a['id'],user,json.dumps(a))); audit(db,a,'agreement_created')
    return a

@app.get('/api/agreements/{id}')
def get(id:str,user=Depends(owner)):
    with transaction() as db: return load(db,id,user)

@app.get('/api/agreements/{id}/audit')
def history(id:str,user=Depends(owner)):
    with transaction() as db:
        load(db,id,user)
        return [dict(r) for r in db.execute('SELECT seq,timestamp,action,prior_status,next_status,details FROM audit WHERE agreement_id=? ORDER BY seq',(id,))]

@app.post('/api/agreements/{id}/negotiate')
def negotiation(id:str,data:Negotiate,user=Depends(owner)):
    # Reserve the maximum live call allowance durably before contacting the model.
    with transaction() as db:
        a=load(db,id,user); require(a,'DRAFT','NEGOTIATION_FAILED')
        if a['mode']=='live':
            if data.scenario!='normal': raise HTTPException(422,'Failure demonstration uses deterministic mode only.')
            calls=db.execute('SELECT calls FROM usage WHERE id=1').fetchone()[0]
            if calls+6>settings.llm_max_calls: raise HTTPException(429,'Server AI call budget exhausted; use deterministic mode or deliberately raise the configured budget.')
            db.execute('UPDATE usage SET calls=calls+6 WHERE id=1')
        change(db,a,'NEGOTIATING','negotiation_started',{'mode':a['mode'],'model':settings.llm_model if a['mode']=='live' else None})
    try: offers,amount,error=negotiate(a,data.scenario)
    except NegotiationError as exc: offers,amount,error=[],None,str(exc)
    with transaction() as db:
        current=load(db,id,user); require(current,'NEGOTIATING')
        current['offers']=offers; current['amount_minor']=amount; current['negotiation_error']=error
        change(db,current,'NEGOTIATION_FAILED' if error else 'PROPOSED','negotiation_blocked' if error else 'terms_proposed',{'reason':error,'turns':len(offers)})
        return current

@app.post('/api/agreements/{id}/accept')
def accept(id:str,data:Approval,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); check_approval(a,data)
        if a['accepted_at']: return a
        require(a,'PROPOSED')
        a['accepted_at']=now(); a['accepted_terms']={k:a[k] for k in ['version','amount_minor','currency','seller_email','buyer_email','criteria','objective','deadline']}
        change(db,a,'ACCEPTED','buyer_accepted_terms'); return a

@app.post('/api/agreements/{id}/invoice')
def invoice(id:str,data:Approval,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); check_approval(a,data)
        if a['invoice']: return a
        require(a,'ACCEPTED')
        try:
            result=paypal.create(a)
            provider_id=result.get('id')
            if not provider_id:
                from urllib.parse import urlparse
                link=next((x['href'] for x in result.get('links',[]) if x.get('rel')=='self'),'')
                parsed=urlparse(link)
                if parsed.hostname=='api-m.sandbox.paypal.com': provider_id=parsed.path.rsplit('/',1)[-1]
            if not provider_id or not provider_id.startswith('INV2-'): raise ProviderError('PayPal did not return a valid invoice identifier.')
            provider=paypal.validate(paypal.get(provider_id),a)
            a['invoice']=paypal.public(provider); a['invoice']['checked_at']=now()
            change(db,a,'INVOICED','sandbox_invoice_created',{'provider_id':provider_id})
        except ProviderError as exc:
            audit(db,a,'invoice_failed',a['status'],{'reason':str(exc)}); error=exc
        else: return a
    raise error

@app.post('/api/agreements/{id}/evidence')
def evidence(id:str,data:Evidence,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); require(a,'INVOICED','NEEDS_REVIEW','VERIFIED')
        a['verification']=verify(a,data.html)
        change(db,a,'VERIFIED' if a['verification']['overall']=='PASS' else 'NEEDS_REVIEW','artifact_verified',{'outcome':a['verification']['overall']})
        return a

@app.post('/api/agreements/{id}/review')
def review(id:str,data:Review,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); require(a,'NEEDS_REVIEW')
        a['human_review']={'accepted':data.accepted,'reason':data.reason,'at':now()}
        change(db,a,'VERIFIED' if data.accepted else 'NEEDS_REVIEW','human_review_recorded',data.model_dump()); return a

@app.post('/api/agreements/{id}/payment-approval')
def payment(id:str,data:Approval,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); check_approval(a,data)
        if a['approved_at'] and a['status'] in {'PAYMENT_PENDING','PAID'}: return a
        require(a,'VERIFIED')
        provider_id=a['invoice']['id']
        try:
            p=paypal.validate(paypal.get(provider_id),a)
            if p.get('status')=='DRAFT': paypal.send(provider_id,a['id']); p=paypal.validate(paypal.get(provider_id),a)
            a['invoice']=paypal.public(p); a['invoice']['checked_at']=now()
            if not a['invoice']['approval_url']: raise ProviderError('PayPal has not returned a sandbox payment link; payment remains unconfirmed.')
            a['approved_at']=now(); change(db,a,'PAYMENT_PENDING','buyer_authorized_paypal_handoff')
        except ProviderError as exc:
            audit(db,a,'payment_handoff_failed',a['status'],{'reason':str(exc)}); error=exc
        else: return a
    raise error

@app.post('/api/agreements/{id}/paypal-status')
def refresh(id:str,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user)
        if not a['invoice']: raise HTTPException(409,'Create an invoice first.')
        p=paypal.validate(paypal.get(a['invoice']['id']),a)
        a['invoice']=paypal.public(p); a['invoice']['checked_at']=now()
        status=a['status']
        # Provider-confirmed payment is a fact, even if the buyer paid outside Pact.
        if p.get('status')=='PAID': status='PAID'
        elif p.get('status') in {'CANCELLED','REFUNDED','PARTIALLY_REFUNDED','MARKED_AS_PAID'}: status='PAYMENT_REVIEW'
        change(db,a,status,'provider_status_checked',{'provider_status':p.get('status')}); return a

@app.post('/api/agreements/{id}/cancel')
def cancel(id:str,user=Depends(owner)):
    with transaction() as db:
        a=load(db,id,user); require(a,'DRAFT','PROPOSED','NEGOTIATION_FAILED','ACCEPTED')
        change(db,a,'CANCELLED','agreement_cancelled'); return a

assets=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if assets.exists(): app.mount('/',StaticFiles(directory=assets,html=True),name='frontend')
