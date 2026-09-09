/**
 * Thrown by server actions when a permission check fails.
 *
 * Lives apart from guards.ts on purpose: lib/utils/form-state.ts needs to
 * recognise it when formatting a message, and form-state is imported by
 * every client form. Keeping the class here means those components do not
 * pull the server guards, and next/headers with them, into the browser
 * bundle.
 */
export class PermissionError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}
