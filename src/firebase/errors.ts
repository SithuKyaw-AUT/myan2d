export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore permission denied for ${context.operation} on ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    // This is to make the error object serializable for the dev overlay
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  toContextObject() {
    return {
      message: this.message,
      context: this.context,
    };
  }
}
