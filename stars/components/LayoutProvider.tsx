"use client";
import { ReactNode } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "@/styles/theme";
import { Provider } from "react-redux";
import { usePathname } from "next/navigation";
import store from "@/app/Redux/store";
import Header from "./Layout/Header";

const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const excludedPaths = [
    "/login",
    "/forgot-password",
    "/register",
    "/reset-password",
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
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-50">
                <Header />{" "}
              </header>

              <main className="flex-1 p-2 sm:p-6  bg-gray-50">
                <div className="w-full p-3 sm:p-6 overflow-x-hidden px-3 sm:px-5 mb-[2rem] mx-auto">
                  {children}
                </div>
              </main>

              <footer className="border-t bg-white">{/* <Footer /> */}</footer>
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
