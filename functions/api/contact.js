import { handleContact } from "../../server/contact-handler.mjs";

export function onRequest(context) {
  return handleContact(context.request, context.env);
}
