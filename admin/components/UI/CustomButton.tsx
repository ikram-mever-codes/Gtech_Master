import React from "react";
import { Button, ButtonProps, styled, Theme } from "@mui/material";
import { CircularProgress } from "@mui/material";

interface CustomButtonProps extends ButtonProps {
  loading?: boolean;
  rounded?: "none" | "small" | "medium" | "large" | "full";
  shadow?: "none" | "small" | "medium" | "large";
  hoverEffect?: "none" | "scale" | "shadow" | "slide" | "float";
  gradient?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const CustomButton = ({
  children,
  loading = false,
  rounded = "medium",
  shadow = "medium",
  hoverEffect = "scale",
  gradient = false,
  variant = "contained",
  color = "primary",
  size = "medium",
  startIcon,
  endIcon,
  fullWidth = false,
  disabled = false,
  sx,
  ...props
}: CustomButtonProps) => {
  const StyledButton = styled(Button)<{
    ownerState: {
      rounded: string;
      shadow: string;
      hoverEffect: string;
      gradient: boolean;
      variant: string;
      color: string;
    };
  }>(({ theme, ownerState }: any) => ({
    minWidth: "unset",
    textTransform: "none",
    fontWeight: 500,
    letterSpacing: "0.5px",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Roboto, sans-serif",
    zIndex: 1,
    boxShadow:
      ownerState.shadow === "none"
        ? "none"
        : ownerState.shadow === "small"
        ? theme.shadows[2]
        : ownerState.shadow === "medium"
        ? theme.shadows[4]
        : theme.shadows[6],

    borderRadius:
      ownerState.rounded === "none"
        ? 0
        : ownerState.rounded === "small"
        ? "4px"
        : ownerState.rounded === "medium"
        ? "8px"
        : ownerState.rounded === "large"
        ? "16px"
        : "50px",

    ...(ownerState.variant === "contained" && {
      ...(ownerState.gradient && {
        background: `linear-gradient(135deg, ${
          theme.palette[ownerState.color].main
        } 0%, ${theme.palette[ownerState.color].dark} 100%)`,
        "&:hover": {
          background: `linear-gradient(135deg, ${
            theme.palette[ownerState.color].dark
          } 0%, ${theme.palette[ownerState.color].main} 100%)`,
        },
      }),
      "&:hover": {
        ...(ownerState.hoverEffect === "scale" && {
          transform: "scale(1.03)",
        }),
        ...(ownerState.hoverEffect === "shadow" && {
          boxShadow: theme.shadows[8],
        }),
        ...(ownerState.hoverEffect === "slide" && {
          "&::before": {
            width: "105%",
          },
        }),
        ...(ownerState.hoverEffect === "float" && {
          transform: "translateY(-3px)",
        }),
      },
      "&:active": {
        transform: "scale(0.98)",
        boxShadow: theme.shadows[2],
      },
    }),

    ...(ownerState.variant === "outlined" && {
      borderWidth: "2px",
      "&:hover": {
        backgroundColor: theme.palette[ownerState.color].light,
        borderWidth: "2px",
        ...(ownerState.hoverEffect === "scale" && {
          transform: "scale(1.03)",
        }),
        ...(ownerState.hoverEffect === "shadow" && {
          boxShadow: theme.shadows[4],
        }),
      },
    }),

    ...(ownerState.variant === "text" && {
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
        ...(ownerState.hoverEffect === "scale" && {
          transform: "scale(1.03)",
        }),
      },
    }),

    // Size variants
    ...(size === "small" && {
      padding: "6px 16px",
      fontSize: "0.75rem",
    }),
    ...(size === "medium" && {
      padding: "8px 22px",
      fontSize: "0.875rem",
    }),
    ...(size === "large" && {
      padding: "11px 28px",
      fontSize: "1rem",
    }),

    // Slide hover effect
    ...(ownerState.hoverEffect === "slide" &&
      ownerState.variant === "contained" && {
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "0%",
          height: "100%",
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
          transition: "all 0.5s ease",
          zIndex: -1,
        },
        "&:hover::before": {
          left: "100%",
        },
      }),

    // Disabled state
    "&.Mui-disabled": {
      ...(ownerState.variant === "contained" && {
        background: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      }),
      ...(ownerState.variant === "outlined" && {
        borderColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      }),
    },
  }));

  const ownerState = {
    rounded,
    shadow,
    hoverEffect,
    gradient,
    variant,
    color,
  };

  return (
    <StyledButton
      ownerState={ownerState}
      variant={variant}
      color={color}
      size={size}
      startIcon={!loading && startIcon}
      endIcon={!loading && endIcon}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      sx={{
        ...sx,
      }}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress
            size={size === "small" ? 16 : size === "medium" ? 20 : 24}
            color="inherit"
            sx={{
              marginRight: children ? "8px" : 0,
              color: variant === "contained" ? "common.white" : "inherit",
            }}
          />
          {children}
        </>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default CustomButton;
