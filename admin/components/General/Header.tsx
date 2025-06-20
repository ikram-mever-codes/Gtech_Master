"use client";

import {
  Box,
  IconButton,
  InputBase,
  Typography,
  Paper,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  alpha,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  LucideBell,
  LucideUser,
  LucideSearch,
  LucideSettings,
  Search,
  Bell,
  LogOut,
  Shield,
  Mail,
  HelpCircle,
} from "lucide-react";
import { use, useState } from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery, Theme } from "@mui/material";
import theme from "@/styles/theme";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { logoutUser } from "@/api/user";

const Header = () => {
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const pathname = usePathname();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md")
  );

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logoutUser(dispatch);
    closeMenu();
  };

  // Get current page title from pathname
  const getPageTitle = () => {
    const path = pathname.split("/").pop();
    return path
      ? `${path.charAt(0).toUpperCase()}${path.slice(1)}`
      : "Dashboard";
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: { xs: "12px 16px", md: "16px 32px" },
        backgroundColor: "background.paper",
        position: "sticky",
        top: 0,
        width: "100%",
        boxShadow: 3,
        zIndex: 1200,
        height: "78px",
        gap: 2,
      }}
    >
      {/* <Typography
        variant="h4"
        component="h1"
        sx={{
          color: "text.primary",
          fontWeight: 700,
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
          lineHeight: 1.2,
          letterSpacing: "-0.015em",
          mb: 1,
          position: "relative",
          "&:after": {
            content: '""',
            position: "absolute",
            bottom: -8,
            left: 0,
            width: "64px",
            height: "4px",
            backgroundColor: "primary.main",
            borderRadius: "2px",
          },
        }}
      >
        {getPageTitle()}
      </Typography> */}
      <form className="w-[35vw]  flex gap-4 px-3 justify-start items-center h-[95%] rounded-lg bg-[#EDEDED] hover:bg-[#d0cfcf] transition-[300ms ease-in-out]">
        <button className="hover-icon">
          <Search />
        </button>
        <input
          style={{ fontFamily: "Roboto, sans-serif" }}
          type="search"
          className="w-full h-full outline-none  "
          placeholder="Search users, orders, reviews products..."
        />
      </form>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, md: 1 },
          pl: { xs: 0, md: 2 },
        }}
      >
        {/* Notification Icon */}
        <IconButton
          sx={{
            "&:hover": {
              backgroundColor: "action.hover",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          <Badge
            badgeContent={3}
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                right: 5,
                top: 5,
                fontWeight: 600,
              },
            }}
          >
            <Bell size={30} color={theme.palette.secondary.main} />
          </Badge>
        </IconButton>

        {/* User Profile Icon with Menu */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: "8px",
            padding: "4px",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <IconButton onClick={openMenu}>
            <Avatar
              src={user?.avatar}
              alt={user?.name}
              color={theme.palette.secondary.main}
            />
          </IconButton>

          {/* Enhanced User Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={closeMenu}
            onClick={closeMenu}
            PaperProps={{
              elevation: 2,
              sx: {
                minWidth: 250,
                maxWidth: 320,
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.08))",
                mt: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                  borderTop: `1px solid ${theme.palette.divider}`,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {/* User profile header */}
            <Box sx={{ px: 2, py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={user?.avatar}
                  alt={user?.name}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: theme.palette.primary.main,
                    border: `2px solid ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )}`,
                  }}
                >
                  {!user?.avatar && user?.name?.charAt(0)}
                </Avatar>
                <Box sx={{ ml: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email || "user@example.com"}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Shield
                  size={14}
                  color={theme.palette.primary.main}
                  style={{ marginRight: "8px" }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.primary.main, fontWeight: 500 }}
                >
                  {user?.role || "Admin"}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Account settings */}
            <MenuItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                <LucideSettings
                  size={18}
                  color={theme.palette.text.secondary}
                />
              </ListItemIcon>
              <ListItemText
                primary="Account Settings"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>

            {/* Profile */}
            <MenuItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                <LucideUser size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Profile"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>

            {/* Notifications */}
            <MenuItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Bell size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Notifications"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>

            {/* Messages */}
            <MenuItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Mail size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Messages"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>

            <Divider />

            {/* Logout button - styled differently to highlight it */}
            <Box sx={{ p: 1.5, pt: 0.5 }}>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  py: 1.5,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                  color: theme.palette.error.main,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.15),
                  },
                }}
              >
                <ListItemIcon>
                  <LogOut size={18} color={theme.palette.error.main} />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: theme.palette.error.main,
                  }}
                />
              </MenuItem>
            </Box>
          </Menu>

          {!isMobile && (
            <Typography
              variant="body2"
              sx={{
                color: "secondary.main",
                fontWeight: 500,
                pr: 1,
                fontFamily: "Roboto, sans-serif",
              }}
            >
              {user?.name?.slice(0, 20)}{" "}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
