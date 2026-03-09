import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Beef,
  Droplets,
  Loader2,
  LogIn,
  LogOut,
  Receipt,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AnimalsPage } from "./components/AnimalsPage";
import { ExpensesPage } from "./components/ExpensesPage";
import { MilkRecordsPage } from "./components/MilkRecordsPage";
import { StaffPage } from "./components/StaffPage";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

type Page = "milk" | "expenses" | "staff" | "animals";

const navItems: {
  id: Page;
  label: string;
  icon: typeof Droplets;
  ocid: string;
}[] = [
  {
    id: "milk",
    label: "Milk Records",
    icon: Droplets,
    ocid: "nav.milk_records.tab",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    ocid: "nav.expenses.tab",
  },
  { id: "staff", label: "Staff", icon: Users, ocid: "nav.staff.tab" },
  { id: "animals", label: "Animals", icon: Beef, ocid: "nav.animals.tab" },
];

export default function App() {
  const [page, setPage] = useState<Page>("milk");
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();

  const isLoggedIn = !!identity;
  // Any logged-in user is the owner and gets full edit access
  const isAdmin = isLoggedIn;
  const isLoggingIn = loginStatus === "logging-in";

  const currentYear = new Date().getFullYear();
  const hostname = window.location.hostname;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading farm records...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Toaster richColors position="top-right" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url('/assets/generated/dairy-farm-hero.dim_1200x300.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(2px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 text-center max-w-sm w-full"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Droplets className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Shree Hari Dairy
            </h1>
            <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
              Shree Hari Dairy — Daily Records
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              Track milk production, expenses, and staff all in one place.
            </p>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="font-semibold text-foreground mb-1">
                Welcome Back
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Sign in to access your farm records
              </p>
              <Button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full gap-2 h-11"
                size="lg"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Secure authentication via Internet Identity
              </p>
            </div>
          </motion.div>
        </div>

        <footer className="py-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {currentYear}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Built with ♥ using caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center h-14 gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                <Droplets className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-800 text-base">
                Shree Hari Dairy
              </span>
            </div>

            <div className="flex-1" />

            {/* Sign Out */}
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              className="gap-1.5 h-8 text-gray-600 border-gray-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation — always visible on all screen sizes */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex">
              {navItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  data-ocid={item.ocid}
                  className={`flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex-1 sm:flex-none ${
                    page === item.id
                      ? "border-green-600 text-green-700 bg-green-50"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {page === "milk" && <MilkRecordsPage isAdmin={isAdmin} />}
            {page === "expenses" && <ExpensesPage isAdmin={isAdmin} />}
            {page === "staff" && <StaffPage isAdmin={isAdmin} />}
            {page === "animals" && <AnimalsPage isAdmin={isAdmin} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            © {currentYear}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-600 transition-colors"
            >
              Built with ♥ using caffeine.ai
            </a>
          </p>
          <p className="text-xs text-gray-400">
            Shree Hari Dairy — Dairy Management
          </p>
        </div>
      </footer>
    </div>
  );
}
