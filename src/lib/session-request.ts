type SessionUser = { uid: string; getIdToken: (forceRefresh?: boolean) => Promise<string> };
type SessionDependencies = { currentUser: () => SessionUser | null; fetch: typeof fetch };

export async function requestWithSession<T>(url: string, options: RequestInit, dependencies: SessionDependencies): Promise<T> {
  const user = dependencies.currentUser();
  if (!user) throw new Error("Bạn cần đăng nhập.");
  const isCurrent = () => dependencies.currentUser() === user;
  const send = async (forceRefresh: boolean) => {
    if (!isCurrent()) throw new Error("Phiên đăng nhập đã thay đổi. Hãy tải lại trang.");
    const token = await user.getIdToken(forceRefresh);
    if (!isCurrent()) throw new Error("Phiên đăng nhập đã thay đổi. Hãy tải lại trang.");
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    headers.set("Authorization", "Bearer " + token);
    // Native window.fetch requires the browser global as its receiver.
    return dependencies.fetch.call(globalThis, url, { ...options, headers });
  };
  let response = await send(false);
  let body = await response.json();
  // Auth guards run before a route reads its body or writes data. Retry only
  // once, and only for expired tokens; never retry revoked sessions or 503s.
  if (response.status === 401 && body.code === "TOKEN_EXPIRED" && !(options.body instanceof ReadableStream)) {
    response = await send(true);
    body = await response.json();
  }
  if (!response.ok) throw new Error(body.error || "Yêu cầu chưa thực hiện được.");
  return body as T;
}
