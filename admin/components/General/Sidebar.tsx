"use client";

import { logoutUser } from "@/api/user";
import { RootState } from "@/app/Redux/store";
import theme from "@/styles/theme";
import {
  BusinessCenterSharp,
  LibraryAdd,
  Logout,
  Person,
  ShopSharp,
} from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography,
  ListItemIcon,
  IconButton,
  useMediaQuery,
  Theme,
  Drawer,
  Button,
  Tooltip,
  listItemSecondaryActionClasses,
} from "@mui/material";
import {
  LucideHome,
  LucideUsers,
  LucideBox,
  LucideChartBar,
  LucideSettings,
  LucideMenu,
  LucideChevronLeft,
  LucideMoveRight,
  LucideChevronRight,
  LucideShield,
  LucideFileText,
  LucideShoppingCart,
  LucideMail,
  LucideHelpCircle,
  Timer,
  BookUser,
  DollarSign,
  IceCream2,
  PackageSearchIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

// Define all possible menu items and their required resources
const allMenuItems = [
  {
    icon: LucideHome,
    text: "Dashboard",
    path: "/dashboard",
    resource: "Dashboard",
  },
  {
    icon: LucideUsers,
    text: "Users",
    path: "/users",
    resource: "Users",
  },
  // {
  //   icon: BookUser,
  //   text: "Customers",
  //   path: "/customers",
  //   resource: "Users",
  // },

  {
    icon: ShopSharp,
    text: "Items Management",
    path: "/items",
    resource: "Items",
  },
  {
    icon: Timer,
    text: "Scheduled Items",
    path: "/scheduled",
    resource: "Users",
  },
  {
    icon: BusinessCenterSharp,
    text: "Bussinesses",
    path: "/bussinesses",
    resource: "Bussinesses",
  },
  {
    icon: BookUser,
    text: "Contacts",
    path: "/contacts",
    resource: "Contacts",
  },
  {
    icon: PackageSearchIcon,
    text: "Requested Items",
    path: "/requested-items",
    resource: "RequestedItems",
  },
  {
    icon: DollarSign,
    text: "Invoices",
    path: "/invoices",
    resource: "Invoices",
  },

  {
    icon: LibraryAdd,
    text: "Library",
    path: "/library",
    resource: "Library",
  },

  // {
  //   icon: LucideMail,
  //   text: "Messages",
  //   path: "/messages",
  //   resource: "Messages",
  // },

  // {
  //   icon: LucideSettings,
  //   text: "Settings",
  //   path: "/settings",
  //   resource: "Settings",
  // },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.user);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md")
  );

  const activePath = usePathname();

  // Filter menu items based on user role and assigned resources
  const menuItems = useMemo(() => {
    // If user is admin, show all menu items
    // if (user?.role === "ADMIN") {
    return allMenuItems;
    // }

    // // Otherwise, filter based on assigned resources
    // if (user?.assignedResources && user.assignedResources.length > 0) {
    //   return allMenuItems.filter((item) =>
    //     user.assignedResources.includes(item.resource)
    //   );
    // }

    // // If no assigned resources but has permissions with resources
    // if (user?.permissions && user.permissions.length > 0) {
    //   const permissionResources = user.permissions.map((perm) => perm.resource);
    //   return allMenuItems.filter((item) =>
    //     permissionResources.includes(item.resource)
    //   );
    // }

    // Fallback to just Dashboard if no permissions
    // return   allMenuItems.filter((item) => item.resource === "Dashboard");
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logoutUser(dispatch);
  };

  // Check if user has view access to a specific resource
  const hasViewPermission = (resource: string) => {
    if (user?.role === "ADMIN") return true;

    if (user?.permissions && user.permissions.length > 0) {
      const permission = user.permissions.find((p) => p.resource === resource);
      return permission ? permission.actions.includes("view") : false;
    }

    return user?.assignedResources?.includes(resource) || false;
  };

  const drawerContent = (
    <Box
      sx={{
        width: { xs: 240, sm: isCollapsed ? 80 : 280 },
        backgroundColor: "secondary.main",
        height: "100vh",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Box
        sx={{
          px: 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "space-between" : "flex-end",
          height: "90px",
          overflow: "hidden",
        }}
      >
        <Link href="/" style={{ flexShrink: 0 }}>
          <Image
            alt="Gtech"
            src="/logo.png"
            width={isCollapsed ? 80 : 170}
            height={isCollapsed ? 80 : 780}
            priority
            style={{
              transition: "all 0.3s ease",
              objectFit: "contain",
            }}
          />
        </Link>
        {!isCollapsed && (
          <IconButton
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{
              display: { xs: "none", sm: "flex" },
            }}
          >
            <LucideChevronLeft color={theme.palette.text.secondary} />
          </IconButton>
        )}
      </Box>

      {isCollapsed && (
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            width: "100%",
            color: "text.secondary",
            display: { xs: "none", sm: "flex" },
          }}
        >
          <LucideChevronRight color={theme.palette.text.secondary} />
        </IconButton>
      )}

      <List
        sx={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          overflowX: "hidden",
        }}
      >
        <Divider sx={{ borderColor: "divider", mb: 2 }} />
        <Box sx={{ width: "100%", px: 1, overflow: "hidden " }}>
          {menuItems.map((item) => (
            <Tooltip
              key={item.text}
              title={isCollapsed ? item.text : ""}
              placement="right"
              arrow
            >
              <ListItem
                component={Link}
                href={item.path}
                sx={{
                  borderTopLeftRadius: "5px",
                  borderBottomLeftRadius: "5px",
                  mb: 0.5,
                  mx: 1,
                  backgroundColor:
                    activePath === item.path || activePath.includes(item.path)
                      ? "rgba(255, 255, 255, 0.15)"
                      : "transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    transform: "translateX(4px)",
                  },
                  minHeight: 48,
                  overflow: "hidden",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width:
                      activePath === item.path || activePath.includes(item.path)
                        ? "3px"
                        : 0,
                    backgroundColor: "primary.main",
                    transition: "width 0.3s ease",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color:
                      activePath === item.path || activePath.includes(item.path)
                        ? "white"
                        : "text.secondary",
                    transition: "color 0.2s ease",
                  }}
                >
                  <item.icon size={20} />
                </ListItemIcon>

                <Typography
                  sx={{
                    fontWeight: 400,
                    opacity: isCollapsed ? 0 : 1,
                    transition: "opacity 0.2s ease, color 0.2s ease",
                    whiteSpace: "nowrap",
                    color: activePath === item.path ? "white" : "#777777",
                  }}
                >
                  {item.text}
                </Typography>
              </ListItem>
            </Tooltip>
          ))}
        </Box>
        <Divider sx={{ borderColor: "divider", my: 2 }} />

        {/* If admin, show a section with user role info */}
        {user?.role && (
          <Box sx={{ px: 3, mb: 2, opacity: isCollapsed ? 0 : 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 1,
                backgroundColor: "rgba(140, 194, 27, 0.15)",
              }}
            >
              <LucideShield
                size={16}
                color={theme.palette.primary.main}
                style={{ marginRight: 8 }}
              />
              <Typography
                variant="caption"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {user.role} ACCESS
              </Typography>
            </Box>
          </Box>
        )}
      </List>

      <Box
        sx={{
          px: 2,
          width: "100%",
          py: 2,
        }}
      >
        <Button
          onClick={handleLogout}
          startIcon={<Logout />}
          sx={{
            width: "100%",
            color: "white",
            backgroundColor: "primary.main",
            fontSize: "17px",
            fontWeight: 600,
          }}
        >
          {!isCollapsed && "Logout"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          onClick={handleDrawerToggle}
          sx={{
            position: "sticky",
            top: 16,
            left: 16,
            zIndex: 1300,
            color: "primary.contrastText",
            backgroundColor: "secondary.main",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
          }}
        >
          <LucideMenu />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={!isMobile ? true : mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            backgroundColor: "secondary.main",
            borderRight: "1px solid",
            borderColor: "divider",
            overflowX: "hidden",
            position: "sticky",
            height: "100%",
            top: 0,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
