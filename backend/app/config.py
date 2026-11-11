from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore"
    )
    paypal_env: str = "sandbox"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    app_session_secret: str = ""
    database_path: str = "pact.db"
    llm_max_calls: int = Field(default=12, ge=0, le=100)
    llm_max_tokens: int = Field(default=600, ge=64, le=1200)
    llm_budget_usd: float = Field(default=2.0, ge=0, le=20)
    llm_input_usd_per_million: float = Field(default=20, ge=0)
    llm_output_usd_per_million: float = Field(default=120, ge=0)
    llm_max_input_bytes: int = Field(default=12000, ge=1000, le=24000)

    secure_cookies: bool = False
    public_origin: str = ""
    app_access_password: str = ""

    @model_validator(mode="after")
    def validate_hosted_mode(self):
        if self.secure_cookies:
            from urllib.parse import urlparse

            origin = urlparse(self.public_origin)
            if (
                origin.scheme != "https"
                or not origin.hostname
                or origin.path
                or origin.query
                or origin.fragment
                or origin.username
            ):
                raise ValueError(
                    "Hosted mode requires an exact HTTPS PUBLIC_ORIGIN without a path, user info or trailing slash."
                )
            if len(self.app_session_secret) < 32 or len(self.app_access_password) < 20:
                raise ValueError(
                    "Hosted mode requires strong session and operator access secrets."
                )
        return self


settings = Settings()
