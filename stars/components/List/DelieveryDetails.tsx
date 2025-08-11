import {
  CARGO_STATUS_OPTIONS,
  DELIVERY_STATUS_CONFIG,
  formatPeriodLabel,
} from "@/app/scheduled-items/lists/[id]/page";
import { DELIVERY_STATUS, INTERVAL_OPTIONS } from "@/utils/interfaces";
import {
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  LocalShipping,
  Visibility,
} from "@mui/icons-material";
import {
  alpha,
  Avatar,
  Box,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CheckCircle,
  Clock,
  Hash,
  Info,
  Package,
  Truck,
  TruckIcon,
} from "lucide-react";
import CustomButton from "../UI/CustomButton";
import { useState } from "react";
import theme from "@/styles/theme";

export default function DeliveryDetailsModal({
  open,
  onClose,
  delivery,
  period,
  itemName,
}: any) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getCargoStatusConfig = (status: string) => {
    return (
      CARGO_STATUS_OPTIONS.find((option) => option.value === status) ||
      CARGO_STATUS_OPTIONS[0]
    );
  };

  const getStatusColor = (status: string) => {
    const config = DELIVERY_STATUS_CONFIG[status || DELIVERY_STATUS.PENDING];
    return config?.color || "default";
  };

  const getStatusLabel = (status: string) => {
    const config = DELIVERY_STATUS_CONFIG[status || DELIVERY_STATUS.PENDING];
    return config?.label || "Pending";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const cargoStatusConfig: any = getCargoStatusConfig(
    delivery?.cargoStatus || "preparing"
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.15)",
          margin: isMobile ? 0 : 2,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 3, sm: 4 },
          py: { xs: 2.5, sm: 3 },
          background: "linear-gradient(135deg, #8CC21B 0%, #4CAF50 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>\')',
            opacity: 0.3,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                width: 48,
                height: 48,
              }}
            >
              <Truck size={24} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                Delivery Details
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {formatPeriodLabel(period, delivery?.cargoNo || "")}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.1)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header Info Card */}
          <Card
            sx={{
              mb: 3,
              p: 3,
              background:
                "linear-gradient(135deg, rgba(140, 194, 27, 0.05) 0%, rgba(76, 175, 80, 0.05) 100%)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 1,
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Package size={20} color={theme.palette.primary.main} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Product Information
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  <strong>Item:</strong> {itemName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Perfiod:</strong> {period}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Info />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Delivery Status
                  </Typography>
                </Box>
                <Chip
                  label={getStatusLabel(delivery?.status)}
                  color={"warning"}
                  size="medium"
                  sx={{
                    margin: "0px 25%",
                    fontWeight: 600,
                    borderRadius: 1,
                    px: 1,
                  }}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Main Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto auto",
              gap: "20px",
            }}
          >
            {/* Quantity Section */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    width: "100%",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Hash size={20} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Quantity
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="primary.main"
                  sx={{ textAlign: "center" }}
                  fontFamily={"Poppins, sans-serif"}
                >
                  {delivery?.quantity || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Units to be delivered
                </Typography>
              </Card>
            </Grid>

            {/* Cargo Information */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  width: "100%",
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.info.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.info.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: "info.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Truck size={20} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Cargo Number
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="primary.main"
                  sx={{ textAlign: "center" }}
                  fontFamily={"Poppins, sans-serif"}
                >
                  {delivery?.cargoNo || "Not assigned"}
                </Typography>
              </Card>
            </Grid>

            {/* Cargo Status */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.info.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    justifyContent: "center",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color:
                        cargoStatusConfig.color === "primary"
                          ? "primary.main"
                          : `${cargoStatusConfig.color}.main`,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {cargoStatusConfig.icon}
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Cargo Status
                  </Typography>
                </Box>
                <Chip
                  label={delivery.cargoStatus}
                  color={cargoStatusConfig.color}
                  size="medium"
                  sx={{
                    margin: "0 25%",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 1,
                  }}
                />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  backgroundColor: "white",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.success.main, 0.5),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.success.main,
                      0.15
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "yellow",
                      color: "black",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <TruckIcon />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Cargo Type
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{ mb: 1, textAlign: "center" }}
                >
                  {delivery?.cargoType}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Transportaion Method
                </Typography>
              </Card>
            </Grid>
            {/* Shipped Date */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.success.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.success.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: "success.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <LocalShipping />
                  </Avatar>
                  <Typography
                    sx={{ mb: 1 }}
                    variant="subtitle1"
                    fontWeight={600}
                  >
                    Shipped Date
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{ mb: 1, textAlign: "center" }}
                >
                  {formatDate(delivery?.shippedAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  When the shipment departed
                </Typography>
              </Card>
            </Grid>

            {/* ETA */}
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.warning.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.warning.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      color: "warning.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Clock size={20} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Estimated Arrival
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{ mb: 1, textAlign: "center" }}
                >
                  {formatDate(delivery?.eta)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Expected delivery date
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 1,
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.warning.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.warning.main,
                      0.1
                    )}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: "info.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Info />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Remarks
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  {delivery.remark || "N/A"}{" "}
                </Typography>
              </Card>
            </Grid>
            {delivery?.deliveredAt && (
              <Grid item xs={12} sm={6}>
                <Card
                  sx={{
                    p: 3,
                    height: "100%",
                    borderRadius: 1,
                    border: `1px solid ${alpha(
                      theme.palette.success.main,
                      0.3
                    )}`,
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    transition: "all 0.3s ease",
                    "&:hover": {
                      borderColor: alpha(theme.palette.success.main, 0.5),
                      boxShadow: `0 8px 24px ${alpha(
                        theme.palette.success.main,
                        0.15
                      )}`,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "success.main",
                        color: "white",
                        width: 40,
                        height: 40,
                      }}
                    >
                      <CheckCircle />
                    </Avatar>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="success.main"
                    >
                      Delivered
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                    {formatDate(delivery?.deliveredAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Successfully delivered
                  </Typography>
                </Card>
              </Grid>
            )}
          </div>

          {/* Timeline Section */}
          <Card
            sx={{
              mt: 4,
              p: 3,
              borderRadius: 1,
              border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
              background:
                "linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.3) 100%)",
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Delivery Timeline
            </Typography>
            <Box sx={{ position: "relative", pl: 2 }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: "absolute",
                  left: 20,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.3),
                }}
              />

              {/* Timeline items */}
              <Stack spacing={3}>
                {delivery?.shippedAt && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: "success.main",
                        width: 32,
                        height: 32,
                        zIndex: 1,
                      }}
                    >
                      <LocalShipping />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Shipped
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(delivery.shippedAt)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {delivery?.eta && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: delivery?.deliveredAt
                          ? "success.main"
                          : "warning.main",
                        width: 32,
                        height: 32,
                        zIndex: 1,
                      }}
                    >
                      {delivery?.deliveredAt ? (
                        <CheckCircle />
                      ) : (
                        <Clock size={16} />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {delivery?.deliveredAt
                          ? "Delivered"
                          : "Expected Arrival"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {delivery?.deliveredAt
                          ? formatDate(delivery.deliveredAt)
                          : formatDate(delivery.eta)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 3, sm: 4 },
          borderTop: `1px solid ${alpha("#E2E8F0", 0.8)}`,
          backgroundColor: alpha("#F8FAFC", 0.5),
        }}
      >
        <CustomButton
          variant="contained"
          onClick={onClose}
          gradient={true}
          sx={{
            minWidth: 120,
            borderRadius: 1,
          }}
        >
          Close
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

export function DeliveryCell({ row, period }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const delivery = row.deliveries?.[period];
  const config =
    DELIVERY_STATUS_CONFIG[delivery?.status || DELIVERY_STATUS.PENDING];

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  return (
    <>
      <Tooltip
        title={
          <Box sx={{ color: "white" }}>
            <Typography color="white" variant="caption" display="block">
              Click to view details
            </Typography>
            <Typography color="white" variant="caption" display="block">
              Period: {period}
            </Typography>
            <Typography color="white" variant="caption" display="block">
              Quantity: {delivery?.quantity || 0}
            </Typography>
            {delivery?.deliveredAt && (
              <Typography color="white" variant="caption" display="block">
                Delivered: {new Date(delivery.deliveredAt).toLocaleDateString()}
              </Typography>
            )}
            {delivery?.cargoNo && (
              <Typography color="white" variant="caption" display="block">
                Cargo: {delivery.cargoNo}
              </Typography>
            )}
          </Box>
        }
      >
        <Box
          onClick={handleCellClick}
          sx={{
            display: "flex",
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            p: 1,
            borderRadius: 1,
            minHeight: 60,
            backgroundColor: alpha("#f5f5f5", 0.3),
            cursor: "pointer",
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              transform: "scale(1.05)",
              boxShadow: `0 4px 12px ${alpha(
                theme.palette.primary.main,
                0.15
              )}`,
            },
          }}
        >
          <Typography
            fontSize={"16px"}
            variant="caption"
            fontWeight={600}
            width={"100%"}
            display={"flex"}
            justifyContent={"center"}
          >
            {Number(delivery?.quantity || 0).toFixed(0) || 0}
          </Typography>
          <Visibility
            fontSize="small"
            sx={{
              opacity: 0.6,
              fontSize: 14,
            }}
          />
        </Box>
      </Tooltip>

      <DeliveryDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        delivery={delivery}
        period={period}
        itemName={row.articleName}
      />
    </>
  );
}

export function EditableCommentCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.comment || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === row.comment) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { comment: value });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      setValue(row.comment);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.comment);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
      >
        <TextField
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={saving}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.875rem" },
          }}
          autoFocus
          onBlur={handleSave}
        />
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
        transition: "background-color 0.2s",
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography variant="body2" sx={{ fontSize: "14px" }}>
        {row.comment || "Add comment..."}
      </Typography>
    </Box>
  );
}

// Editable Marked Cell Component
export function EditableMarkedCell({ row, onUpdateItem }: any) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    try {
      setSaving(true);
      await onUpdateItem(row.id, { marked: !row.marked });
    } catch (error) {
      console.error("Failed to update marked status:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {saving ? (
        <CircularProgress size={20} />
      ) : (
        <Checkbox
          size="small"
          checked={row.marked || false}
          icon={<CheckBoxOutlineBlank />}
          checkedIcon={<CheckBox />}
          onChange={handleToggle}
        />
      )}
    </Box>
  );
}

export function EditableIntervalCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.interval || "monthly");
  const [saving, setSaving] = useState(false);

  const handleSave = async (newValue: string) => {
    if (newValue === row.interval) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { interval: newValue });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update interval:", error);
      setValue(row.interval);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLabel = () => {
    const option = INTERVAL_OPTIONS.find(
      (opt) => opt.value === (row.interval || "monthly")
    );
    return option ? option.label : "Monatlich";
  };

  if (isEditing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleSave(e.target.value);
            }}
            disabled={saving}
            sx={{ fontSize: "0.875rem", height: 32 }}
            onClose={() => setIsEditing(false)}
            autoFocus
            open={isEditing}
          >
            {INTERVAL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
        transition: "background-color 0.2s",
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography variant="body2" sx={{ fontSize: "14px" }}>
        {getCurrentLabel()}
      </Typography>
    </Box>
  );
}

export function EditableQuantityCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.quantity || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === row.quantity) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { quantity: Number(value) });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      setValue(row.quantity);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.quantity);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
      >
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={saving}
          sx={{
            width: 80,
            "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.875rem" },
          }}
          autoFocus
          onBlur={handleSave}
        />
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
        transition: "background-color 0.2s",
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography variant="body2" fontWeight={600} sx={{ fontSize: "16px" }}>
        {row.quantity || 0}
      </Typography>
    </Box>
  );
}
