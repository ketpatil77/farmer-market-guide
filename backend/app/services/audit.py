from datetime import datetime
from uuid import uuid4

from app.core.storage import append_record


def audit_log(action, entity_type, entity_id, user_id, old_value=None, new_value=None):
    record = {
        "id": str(uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "old_value": old_value,
        "new_value": new_value,
    }
    append_record("audit_log.json", record)
    return record
