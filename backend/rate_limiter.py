import time

_last_request_log = {}
COOLDOWN_SECONDS = 24 * 60 * 60  # 24 hours


def is_rate_limited(phone: str, need_type: str) -> bool:
    key = f"{phone.strip()}|{need_type}"
    now = time.time()
    last_time = _last_request_log.get(key)

    if last_time is not None and (now - last_time) < COOLDOWN_SECONDS:
        return True

    _last_request_log[key] = now
    return False