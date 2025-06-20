"use client";
import React from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

/**
 * @param {Object} props
 * @param {"full" | "container" | "inline"} props.type - Type of loader
 * @param {string} props.text - Optional text to display
 * @param {Object} props.sx - Additional styles
 */
const Loading = ({ type = "full", text, sx = {} }: any) => {
  const theme = useTheme();

  // Full page loader
  if (type === "full") {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255)",
          zIndex: 9999,
          ...sx,
        }}
      >
        <CircularProgress
          size={60}
          thickness={4}
          sx={{ color: theme.palette.primary.main }}
        />
        {text && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 3, fontWeight: 500 }}
          >
            {text}
          </Typography>
        )}
      </Box>
    );
  }

  // Container loader (for cards, sections)
  if (type === "container") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          height: "100%",
          minHeight: 150,
          ...sx,
        }}
      >
        <CircularProgress
          size={40}
          thickness={4}
          sx={{ color: theme.palette.primary.main }}
        />
        {text && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontWeight: 500 }}
          >
            {text}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        ...sx,
      }}
    >
      <CircularProgress
        size={24}
        thickness={4}
        sx={{ color: theme.palette.primary.main }}
      />
      {text && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: 2, fontWeight: 500 }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};

export default Loading;
