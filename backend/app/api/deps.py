from typing import Annotated

from fastapi import Header


def parse_user_from_headers(
    x_user_id: str | None = None,
    x_user_role: str | None = None,
) -> dict[str, str]:
    return {"user_id": x_user_id or "demo-user", "role": x_user_role or "user"}


async def get_current_user(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_role: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    return parse_user_from_headers(x_user_id=x_user_id, x_user_role=x_user_role)
