"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DEMO_CREDENTIALS } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"buyer" | "farmer">("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: DEMO_CREDENTIALS.buyer.email,
    mobile: "",
    password: DEMO_CREDENTIALS.buyer.password,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setLoading(false);
        setMessage("Invalid credentials");
        return;
      }

      router.push("/account");
      router.refresh();
      return;
    }

    const response = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        role,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setLoading(false);
      setMessage(data.error ?? "Registration failed");
      return;
    }

    setMessage(data.message ?? "Registration complete. You can now sign in.");
    const loginResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      setMode("login");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="surface-card p-8">
            <span className="tag-pill">Auth</span>
            <h1 className="mt-6 font-serif text-5xl font-bold leading-tight">
              Buyer and farmer access in one simple place.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-ink-600">
              Use demo credentials for quick testing, or register a new Mongo-backed account.
              New registrations are saved to the database and can sign in immediately.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {Object.entries(DEMO_CREDENTIALS).map(([demoRole, values]) => (
                <button
                  key={demoRole}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      email: values.email,
                      password: values.password,
                    }))
                  }
                  className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-left"
                >
                  <p className="font-bold capitalize">{demoRole}</p>
                  <p className="mt-2 text-xs text-ink-500">{values.email}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="surface-card p-8">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  mode === "login" ? "bg-brand-600 text-white" : "bg-brand-50 text-ink-600"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  mode === "register" ? "bg-brand-600 text-white" : "bg-brand-50 text-ink-600"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "register" ? (
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="input-shell w-full"
                  placeholder="Full name"
                />
              ) : null}
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="input-shell w-full"
                placeholder="Email"
              />
              {mode === "register" ? (
                <input
                  value={form.mobile}
                  onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
                  className="input-shell w-full"
                  placeholder="Mobile number"
                />
              ) : null}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="input-shell w-full"
                placeholder="Password"
              />

              {mode === "register" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`rounded-2xl border p-4 text-left ${
                      role === "buyer" ? "border-brand-300 bg-brand-50" : "border-brand-100"
                    }`}
                  >
                    <p className="font-bold">Buyer account</p>
                    <p className="mt-1 text-sm text-ink-500">Shop, track orders, save addresses.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("farmer")}
                    className={`rounded-2xl border p-4 text-left ${
                      role === "farmer" ? "border-brand-300 bg-brand-50" : "border-brand-100"
                    }`}
                  >
                    <p className="font-bold">Farmer account</p>
                    <p className="mt-1 text-sm text-ink-500">List produce and manage orders.</p>
                  </button>
                </div>
              ) : null}

              {message ? <p className="text-sm text-brand-700">{message}</p> : null}

              <button type="submit" disabled={loading} className="primary-button w-full rounded-2xl disabled:opacity-60">
                {loading ? "Please wait..." : mode === "login" ? "Secure login" : "Create account"}
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
