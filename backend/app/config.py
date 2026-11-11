from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='../.env', extra='ignore')
    paypal_env: str = 'sandbox'
    paypal_client_id: str = ''
    paypal_client_secret: str = ''
    llm_api_key: str = ''
    llm_model: str = ''
    app_session_secret: str = ''
    database_path: str = 'pact.db'
    llm_max_calls: int = 12
    llm_max_tokens: int = 600

settings = Settings()
