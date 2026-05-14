exports.ActivityAction = Object.freeze({
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    MOVE: 'MOVE',
    LOGIN: 'LOGIN',
    ASSIGN: 'ASSIGN',
    
    EXTENSION_REQUEST: 'EXTENSION_REQUEST',
    EXTENSION_APPROVE: 'EXTENSION_APPROVE',
    EXTENSION_REJECT: 'EXTENSION_REJECT',
    LATE_COMPLETION: 'LATE_COMPLETION'
});

exports.ActivitySource = Object.freeze({
    SYSTEM: 'SYSTEM',
    USER: 'USER',
    AI: 'AI'
});