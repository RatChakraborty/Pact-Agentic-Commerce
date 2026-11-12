/** Vercel ignored-build command: exit 0 holds a deployment; exit 1 builds it.
 * Production stays held until the account owner records the tested exact SHA.
 * This release gate does not authorize any financial capability.
 */
function shouldBuild(env) {
  if (env.VERCEL_ENV === "preview") return true;
  if (env.VERCEL_ENV !== "production") return false;
  return (
    /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA || "") &&
    env.PACT_PRODUCTION_RELEASE_SHA === env.VERCEL_GIT_COMMIT_SHA &&
    env.PUBLIC_DEMO === "true" &&
    env.ENABLE_LIVE_OPERATIONS === "false" &&
    env.LLM_MAX_CALLS === "0" &&
    env.LLM_BUDGET_USD === "0"
  );
}
module.exports = { shouldBuild };
if (require.main === module) {
  const build = shouldBuild(process.env);
  process.stdout.write(
    build
      ? "PACT_RELEASE_GATE: build permitted\n"
      : "PACT_RELEASE_GATE: deployment held pending exact release acceptance/configuration\n",
  );
  process.exit(build ? 1 : 0);
}
