"""Email formatting and the /send/email endpoint."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from services.email_service import format_email_body

client = TestClient(app)


def test_email_html_escapes_user_values():
    _, html_body = format_email_body(
        "<script>alert(1)</script>\nline2", tone='"><img src=x>', language="<b>hi</b>"
    )
    assert "<script>" not in html_body
    assert "&lt;script&gt;alert(1)&lt;/script&gt;<br>line2" in html_body
    assert "<img" not in html_body
    assert "&lt;b&gt;hi&lt;/b&gt;" in html_body


def test_send_email_ignores_client_smtp_credentials():
    with patch("routers.sharing_router.send_email", return_value={"success": True}) as mock_send:
        resp = client.post(
            "/api/send/email",
            json={
                "text": "hello",
                "to_email": "a@example.com",
                "smtp_username": "evil@example.com",
                "smtp_password": "secret",
            },
        )
    assert resp.status_code == 200
    kwargs = mock_send.call_args.kwargs
    assert "smtp_username" not in kwargs and "smtp_password" not in kwargs
