const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8CC21B",
          50: "#f8faf4",
          100: "#eef5e3",
          500: "#8CC21B",
          600: "#7aad16",
        },
        secondary: {
          DEFAULT: "#262A2E",
          50: "#f4f4f4",
          100: "#e8e8e8",
          900: "#262A2E",
        },
        background: {
          default: "#F4F4F4",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#2C2C2C",
          secondary: "#777777",
          disabled: "#BDBDBD",
        },
        divider: "#404246",
        error: {
          DEFAULT: "#F44336",
          600: "#d32f2f",
        },
      },
      fontFamily: {
        poppins: ["Poppins", ...fontFamily.sans],
        body: ["Roboto", ...fontFamily.sans],
      },
      spacing: {
        px: "1px",
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
      },
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 4px 10px rgba(0, 0, 0, 0.1)",
        header: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
