def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_health_no_auth_required(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_root_get_and_head(client):
    get_response = client.get("/")
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "running"

    head_response = client.head("/")
    assert head_response.status_code == 200
