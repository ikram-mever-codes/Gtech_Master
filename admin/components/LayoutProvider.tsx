"use client";
import { ReactNode } from "react";
import Header from "./General/Header";
import Sidebar from "./General/Sidebar";
import Footer from "./General/Footer";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "@/styles/theme";
import { Provider } from "react-redux";
import { usePathname } from "next/navigation";
import store from "@/app/Redux/store";
import { Toaster } from "react-hot-toast";

const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const excludedPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify",
  ];

  const shouldRenderLayout = !excludedPaths.includes(pathname || "");

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {shouldRenderLayout ? (
          <div
            className={`w-full min-h-screen h-max bg-[${theme.palette.secondary.main}] flex`}
          >
            <aside className="sticky top-0 h-[100vh]">
              <Sidebar />
            </aside>

            <div className="flex-1 flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-50">
                <Header />
              </header>

              <main className="flex-1 p-6 bg-gray-50">
                <div className="w-full px-8 py-6 mb-[2rem] mx-auto">
                  {children}
                </div>
              </main>

              <footer className="border-t bg-white">
                <Footer />
              </footer>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-screen">{children}</div>
        )}
      </ThemeProvider>
    </Provider>
  );
};

export default LayoutProvider;
