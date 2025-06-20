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
    fontFamily: "'Poppins', sans-serif",
    h1: {
      fontWeight: 700,
      fontSize: "2.25rem",
      color: "#212529",
    },
    h2: {
      fontWeight: 600,
      fontSize: "1.75rem",
      color: "#212529",
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.5rem",
      color: "#212529",
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.25rem",
      color: "#212529",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1rem",
      color: "#212529",
    },
    h6: {
      fontWeight: 600,
      fontSize: "0.875rem",
      color: "#212529",
    },
    body1: {
      fontWeight: 400,
      fontSize: "1rem",
      color: "#212529",
    },
    body2: {
      fontWeight: 400,
      fontSize: "0.875rem",
      color: "#495057",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: "1rem",
      color: "#495057",
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: "0.875rem",
      color: "#6C757D",
    },
    caption: {
      fontWeight: 400,
      fontSize: "0.75rem",
      color: "#6C757D",
    },
    overline: {
      fontWeight: 400,
      fontSize: "0.75rem",
      color: "#6C757D",
      textTransform: "uppercase",
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  components: {
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
        root: {
          fontFamily: "'Poppins', sans-serif",
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
  },
});

export default theme;
