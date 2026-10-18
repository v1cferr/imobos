"""Push notifications to the admin's phone through ntfy (https://ntfy.sh), best effort.

ntfy.sh is a third party, so a notification never carries personal data: it says what happened
and links to the screen where the admin acts. An empty IMOBOS_NOTIFY_URL turns it off.
"""

import logging

import httpx

from .config import Settings

log = logging.getLogger("imobos.notify")


def notify_admin(
    client: httpx.Client,
    settings: Settings,
    *,
    title: str,
    message: str,
    path: str,
    priority: str = "default",
) -> None:
    if not settings.notify_url:
        return
    try:
        response = client.post(
            settings.notify_url,
            content=message.encode(),
            headers={
                "Title": title,
                "Priority": priority,
                "Tags": "house",
                "Click": settings.public_url + path,
            },
            timeout=5,
        )
        if response.status_code >= 400:
            log.warning("notify.failed status=%s", response.status_code)
    except httpx.HTTPError as e:
        # Never block or fail a sign-in because a push could not be delivered.
        log.warning("notify.failed error=%s", type(e).__name__)
