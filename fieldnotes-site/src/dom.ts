export function $(selector: "#export"): HTMLButtonElement;
export function $(selector: "#gene" | "#unit"): HTMLSelectElement;
export function $(selector: "#observation-dialog"): HTMLDialogElement;
export function $(selector: string): HTMLElement;
export function $(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw Error(`Missing interface element: ${selector}`);
  return element;
}
export const esc = (value: unknown) =>
  String(value ?? "Not measured").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const fmt = (value: number | null) =>
  value === null ? "Not measured" : value.toFixed(3);
declare global {
  interface Document {
    modelContext?: {
      registerTool(
        tool: {
          name: string;
          description: string;
          inputSchema: unknown;
          annotations: unknown;
          execute(input: unknown): unknown;
        },
        options: { signal: AbortSignal },
      ): unknown;
    };
  }
}
