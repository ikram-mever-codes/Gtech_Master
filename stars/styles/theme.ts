import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#8CC21B",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#262A2E",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212529",
      secondary: "#495057",
      disabled: "#ADB5BD",
    },
    divider: "#464a4f",
    success: {
      main: "#4CAF50",
      contrastText: "#FFFFFF",
    },
    warning: {
      main: "#FF9800",
      contrastText: "#212529",
    },
    error: {
      main: "#F44336",
      contrastText: "#FFFFFF",
    },
    info: {
      main: "#2196F3",
      contrastText: "#FFFFFF",
    },
  },
  typography: {
    // Modified to include both Syne and Poppins
    fontFamily: "'Poppins', sans-serif",
    h1: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 800, // Extra Bold for stronger impact
      fontSize: "2.5rem",
      color: "#212529",
      letterSpacing: "0.02em", // Slightly increased letter spacing for headers
    },
    h2: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 700,
      fontSize: "2rem",
      color: "#212529",
      letterSpacing: "0.01em",
    },
    h3: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 700,
      fontSize: "1.75rem",
      color: "#212529",
    },
    h4: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 600,
      fontSize: "1.5rem",
      color: "#212529",
    },
    h5: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 600,
      fontSize: "1.25rem",
      color: "#212529",
    },
    h6: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 600,
      fontSize: "1rem",
      color: "#212529",
    },
    body1: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 400,
      fontSize: "1rem",
      color: "#212529",
      lineHeight: 1.6, // Improved line height for better readability
    },
    body2: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 400,
      fontSize: "0.875rem",
      color: "#495057",
      lineHeight: 1.6,
    },
    button: {
      fontFamily: "'Poppins', sans-serif",
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.03em", // Slightly increased letter spacing for buttons
    },
    subtitle1: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
      fontSize: "1rem",
      color: "#495057",
    },
    subtitle2: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
      fontSize: "0.875rem",
      color: "#6C757D",
    },
    caption: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 400,
      fontSize: "0.75rem",
      color: "#6C757D",
    },
    overline: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 400,
      fontSize: "0.75rem",
      color: "#6C757D",
      textTransform: "uppercase",
      letterSpacing: "0.08em", // Increased letter spacing for overline text
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          padding: "10px 20px",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            transform: "translateY(-2px)", // Subtle hover animation
            transition: "transform 0.2s ease-in-out",
          },
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid #E9ECEF",
          transition: "transform 0.2s ease, box-shadow 0.2s ease", // Smooth transition for hover effects
          "&:hover": {
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
            transform: "translateY(-4px)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#262A2E",
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#262A2E",
          color: "#FFFFFF",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        // Default font family is Poppins, headings will use Syne based on variant
        root: {
          fontFamily: "'Poppins', sans-serif",
        },
        h1: {
          fontFamily: "'Syne', sans-serif",
        },
        h2: {
          fontFamily: "'Syne', sans-serif",
        },
        h3: {
          fontFamily: "'Syne', sans-serif",
        },
        h4: {
          fontFamily: "'Syne', sans-serif",
        },
        h5: {
          fontFamily: "'Syne', sans-serif",
        },
        h6: {
          fontFamily: "'Syne', sans-serif",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E9ECEF",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#CED4DA",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#8CC21B",
            borderWidth: 1,
          },
          transition: "all 0.2s ease-in-out", // Smooth transition for focus states
        },
      },
    },
    MuiGrid: {
      styleOverrides: {
        root: {
          border: "none",
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #E9ECEF",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#F8F9FA",
            borderBottom: "2px solid #E9ECEF",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontFamily: "'Syne', sans-serif", // Using Syne for column headers
            fontWeight: 600,
          },
          "& .MuiDataGrid-row": {
            "&:nth-of-type(even)": {
              backgroundColor: "#F8F9FA",
            },
            "&:hover": {
              backgroundColor: "#F1F3F5",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        filled: {
          color: "#FFFFFF",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          minWidth: 200,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          padding: "8px 16px",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.01em",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        message: {
          fontFamily: "'Poppins', sans-serif",
        },
      },
    },
  },
});

export default theme;
