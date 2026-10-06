"use client";
import { AppearanceControls } from "./appearance";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from "lucide-react";
import { firebaseAuth, firebaseConfigured, authError } from "@/lib/firebase";
import { Logo } from "./ui";
import { useAuth } from "./auth-provider";
export function AuthForm({ mode }: { mode: "login" | "register" | "reset" }) {
  const router = useRouter();
  const { user, loading, error: sessionError } = useAuth();
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    if (completed && user && !loading) router.replace("/app");
  }, [completed, user, loading, router]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (
      mode === "register" &&
      (password !== confirm ||
        !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password))
    ) {
      setError(
        "Mật khẩu cần khớp và có ít nhất 8 ký tự, chữ hoa, chữ thường, số.",
      );
      return;
    }
    setBusy("email");
    try {
      const auth = firebaseAuth();
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess(
          "Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại. Hãy kiểm tra cả thư rác.",
        );
      } else if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setCompleted(true);
      } else {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(user, { displayName: name.trim() });
        try {
          await sendEmailVerification(user);
        } catch {}
        setCompleted(true);
      }
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(null);
    }
  }
  async function google() {
    if (busy) return;
    setBusy("google");
    setError("");
    setSuccess("");
    try {
      const p = new GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(firebaseAuth(), p);
      setCompleted(true);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Logo />
        <div>
          <span className="pill">
            <Sparkles size={14} /> KHÔNG GIAN HỌC TẬP · LỚP 6—9
          </span>
          <h2>
            Để mỗi điều bạn học
            <br />
            đều trở nên
            <br />
            <em>đáng nhớ.</em>
          </h2>
          <p>
            Từ trang vở viết tay đến thư viện kiến thức.
            <br />
            Cùng NoteLab, học theo cách của riêng bạn.
          </p>
          <blockquote>Học để mỗi ngày hiểu thêm một chút.</blockquote>
        </div>
        <small>CHỤP · SẮP XẾP · KHÁM PHÁ · GHI NHỚ</small>
      </aside>
      <main className="auth-main">
        <div className="auth-appearance">
          <AppearanceControls />
        </div>
        <Link className="back-link" href="/">
          <ArrowLeft size={16} /> Trang chủ
        </Link>
        <div className="auth-form">
          <span className="eyebrow">
            {mode === "register" ? "MỘT KHỞI ĐẦU MỚI" : "CHÀO MỪNG BẠN"}
          </span>
          <h1>
            {mode === "register"
              ? "Tạo tài khoản của bạn"
              : mode === "reset"
                ? "Quên mật khẩu?"
                : "Tiếp tục hành trình học"}
          </h1>
          <p>Một vũ trụ nhỏ cho hành trình học tập THCS.</p>
          {!firebaseConfigured && (
            <div className="notice">
              <strong>Dịch vụ tài khoản chưa được kết nối.</strong>
              <span>
                Khám phá giao diện và trò chơi trong{" "}
                <Link href="/app?mode=demo">bản mẫu</Link>.
              </span>
            </div>
          )}
          {(error || sessionError) && (
            <p className="form-error auth-error" role="alert">
              {error || sessionError}
            </p>
          )}
          {mode === "register" && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Tôi đã đọc <Link href="/privacy">quyền riêng tư</Link> và đồng ý
                ảnh/nội dung được xử lý qua Gemini và Mistral khi sử dụng AI.
              </span>
            </label>
          )}
          {mode !== "reset" && (
            <>
              <button
                className="button secondary full"
                disabled={
                  Boolean(busy) ||
                  !firebaseConfigured ||
                  (mode === "register" && !consent)
                }
                type="button"
                aria-busy={busy === "google"}
                onClick={google}
              >
                {busy === "google" ? (
                  <Loader2 className="spin" size={19} />
                ) : (
                  <GoogleIcon />
                )}
                {busy === "google"
                  ? "Đang kết nối Google…"
                  : "Tiếp tục với Google"}
              </button>
              {busy === "google" && (
                <p className="auth-progress" role="status">
                  Hoàn tất đăng nhập trong cửa sổ Google đang mở.
                </p>
              )}
              <div className="divider">hoặc dùng email</div>
            </>
          )}
          <form onSubmit={submit} aria-busy={busy === "email"}>
            {mode === "register" && (
              <label>
                Họ và tên
                <input
                  required
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bạn muốn chúng mình gọi là…"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@gmail.com"
              />
            </label>
            {mode !== "reset" && (
              <>
                <label>
                  Mật khẩu
                  <div className="password-field">
                    <input
                      required
                      type={show ? "text" : "password"}
                      minLength={mode === "register" ? 8 : 1}
                      maxLength={128}
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {mode === "register" ? (
                  <>
                    <small className="hint">
                      Ít nhất 8 ký tự, có chữ hoa, chữ thường và số.
                    </small>
                    <label>
                      Xác nhận mật khẩu
                      <input
                        required
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <Link className="forgot-link" href="/forgot-password">
                    Quên mật khẩu?
                  </Link>
                )}
              </>
            )}
            {success && (
              <p className="notice" role="status">
                {success}
              </p>
            )}
            <button
              className="button primary full"
              disabled={
                Boolean(busy) ||
                !firebaseConfigured ||
                (mode === "register" && !consent)
              }
              aria-busy={busy === "email"}
            >
              {busy === "email" ? <Loader2 className="spin" size={17} /> : null}
              {mode === "register"
                ? "Tạo tài khoản"
                : mode === "reset"
                  ? "Gửi liên kết đặt lại"
                  : "Đăng nhập"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "register" ? (
              <>
                Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
              </>
            ) : mode === "reset" ? (
              <Link href="/login">Quay lại đăng nhập</Link>
            ) : (
              <>
                Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
              </>
            )}
          </p>
        </div>
        <small className="auth-security">
          Xác thực bằng Firebase Authentication.
        </small>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="google-icon"
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 48 48"
    >
      <path
        fill="#4285F4"
        d="M43.6 20.5H24v8h11.3C33.7 33.6 29.5 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.2l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 20-8.4 20-21c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#34A853"
        d="M6.3 35.1l6.6-5.1C15.1 34.2 19.2 37 24 37c5.5 0 9.7-3.4 11.3-8.5h8.3C42 38.2 34.3 45 24 45c-7.5 0-14.1-3.9-17.7-9.9z"
      />
      <path
        fill="#FBBC05"
        d="M3 24c0-3.8 1-7.4 2.8-10.5l6.8 5.2A13 13 0 0 0 11 24c0 2.2.5 4.2 1.5 6l-6.6 5.1A21 21 0 0 1 3 24z"
      />
      <path
        fill="#EA4335"
        d="M5.8 13.5A21 21 0 0 1 24 3c5.5 0 10.5 2.1 14.3 5.5l-5.7 5.7A13 13 0 0 0 24 11c-5.2 0-9.6 3.1-11.4 7.7z"
      />
    </svg>
  );
}
