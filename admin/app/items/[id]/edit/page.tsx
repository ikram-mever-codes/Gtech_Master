"use client";

import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
    LucideArrowLeft,
    LucideSave,
    LucidePackage,
    LucideSettings,
    LucideBox,
    LucideFileText,
    LucideCheck,
    LucideAlertCircle,
    LucideInfo,
    LucideImage,
} from "lucide-react";
import {
    Typography,
    MenuItem,
    FormControl,
    Select,
    Button,
    Box,
    Paper,
    TextField,
    CircularProgress,
    Alert,
    IconButton,
    alpha,
    useTheme,
    Grid,
    Switch,
    FormControlLabel,
    InputAdornment,
    Breadcrumbs,
} from "@mui/material";
import theme from "@/styles/theme";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import {
    getItemById,
    updateItem,
    getParents,
    getAllTarics,
} from "@/api/items";
import { getCategories } from "@/api/categories";
import CustomButton from "@/components/UI/CustomButton";

const validationSchema = Yup.object({
    item_name: Yup.string().required("Item name is required"),
    parent_id: Yup.number().required("Parent is required").min(1, "Please select a parent"),
    ean: Yup.string().nullable(),
    weight: Yup.number().min(0, "Must be positive").nullable(),
    length: Yup.number().min(0, "Must be positive").nullable(),
    width: Yup.number().min(0, "Must be positive").nullable(),
    height: Yup.number().min(0, "Must be positive").nullable(),
});

const EditItemPage = () => {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [parents, setParents] = useState<any[]>([]);
    const [tarics, setTarics] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const formik = useFormik({
        initialValues: {
            item_name: "",
            item_name_cn: "",
            ean: "",
            parent_id: 0,
            taric_id: 0,
            cat_id: 0,
            weight: 0,
            length: 0,
            width: 0,
            height: 0,
            model: "",
            remark: "",
            npr_remark: "",
            photo: "",
            pix_path_eBay: "",
            isActive: true,
            is_qty_dividable: true,
            is_npr: false,
            is_eur_special: false,
            is_rmb_special: false,
        },
        validationSchema,
        onSubmit: async (values) => {
            setSaving(true);
            try {
                const payload = {
                    ...values,
                    isActive: values.isActive ? "Y" : "N",
                    is_qty_dividable: values.is_qty_dividable ? "Y" : "N",
                    is_npr: values.is_npr ? "Y" : "N",
                    is_eur_special: values.is_eur_special ? "Y" : "N",
                    is_rmb_special: values.is_rmb_special ? "Y" : "N",
                    parent_id: Number(values.parent_id),
                    taric_id: values.taric_id ? Number(values.taric_id) : undefined,
                    cat_id: values.cat_id ? Number(values.cat_id) : undefined,
                    weight: values.weight ? Number(values.weight) : 0,
                    length: values.length ? Number(values.length) : 0,
                    width: values.width ? Number(values.width) : 0,
                    height: values.height ? Number(values.height) : 0,
                };

                const response: any = await updateItem(Number(id), payload);
                if (response.success) {
                    toast.success("Item updated successfully");
                    router.push("/items");
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to update item");
            } finally {
                setSaving(false);
            }
        },
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [itemRes, parentsRes, taricsRes, catsRes]: any = await Promise.all([
                    getItemById(Number(id)),
                    getParents({ limit: 1000, isActive: "Y" }),
                    getAllTarics({ limit: 1000 }),
                    getCategories(),
                ]);

                if (itemRes.success) {
                    const item = itemRes.data;
                    const parentId = item.parent_id || (parentsRes.data?.find((p: any) => p.de_no === item.parent?.noDE)?.id || 0);
                    const taricId = item.taric_id || (taricsRes.data?.find((t: any) => t.code === item.others?.taricCode)?.id || 0);
                    const catId = item.cat_id || (catsRes.data?.find((c: any) => c.name === item.category)?.id || 0);

                    formik.setValues({
                        item_name: item.name || "",
                        item_name_cn: item.nameCN || "",
                        ean: item.ean || "",
                        parent_id: parentId,
                        taric_id: taricId,
                        cat_id: catId,
                        weight: Number(item.dimensions?.weight) || 0,
                        length: Number(item.dimensions?.length) || 0,
                        width: Number(item.dimensions?.width) || 0,
                        height: Number(item.dimensions?.height) || 0,
                        model: item.model || "",
                        remark: item.remark || "",
                        npr_remark: item.nprRemarks || "",
                        photo: item.pictures?.shopPicture || "",
                        pix_path_eBay: item.pictures?.ebayPictures || "",
                        isActive: item.isActive,
                        is_qty_dividable: item.others?.isQTYdiv || false,
                        is_npr: item.others?.isNPR || false,
                        is_eur_special: item.parent?.isEURSpecial || false,
                        is_rmb_special: item.parent?.isRMBSpecial || false,
                    });
                }

                if (parentsRes.success) setParents(parentsRes.data);
                if (taricsRes.success) setTarics(taricsRes.data);
                if (catsRes.success) setCategories(catsRes.data);

            } catch (err: any) {
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress size={40} sx={{ color: "#8CC21B" }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 0, maxWidth: "1200px", mx: "auto" }}>
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                    <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{ mb: 1 }}>
                        <Link href="/items" style={{ textDecoration: "none", color: "inherit" }}>
                            <Typography variant="body2" sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
                                Items
                            </Typography>
                        </Link>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                            Edit Item
                        </Typography>
                    </Breadcrumbs>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "secondary.main", display: "flex", alignItems: "center", gap: 2 }}>
                        <LucidePackage size={32} color="#8CC21B" />
                        Edit Item: {formik.values.item_name}
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => router.back()}
                        startIcon={<LucideArrowLeft size={18} />}
                        sx={{
                            borderRadius: "4px",
                            borderColor: "#e0e0e0",
                            color: "text.primary",
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            "&:hover": { borderColor: "#ccc", bgcolor: "#f5f5f5" }
                        }}
                    >
                        Back
                    </Button>
                    <CustomButton
                        onClick={() => formik.handleSubmit()}
                        disabled={saving || !formik.dirty}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <LucideSave size={18} />}
                        gradient
                        shadow="medium"
                        rounded="small"
                        sx={{ px: 4 }}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </CustomButton>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: "4px" }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <LucideBox size={20} color="#8CC21B" />
                            General Information
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="item_name"
                                    name="item_name"
                                    label="Item Name (German)"
                                    value={formik.values.item_name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.item_name && Boolean(formik.errors.item_name)}
                                    helperText={formik.touched.item_name && formik.errors.item_name}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="item_name_cn"
                                    name="item_name_cn"
                                    label="Item Name (Chinese)"
                                    value={formik.values.item_name_cn}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="ean"
                                    name="ean"
                                    label="EAN / Barcode"
                                    value={formik.values.ean}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="model"
                                    name="model"
                                    label="Model"
                                    value={formik.values.model}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>Parent Product</Typography>
                                    <Select
                                        id="parent_id"
                                        name="parent_id"
                                        value={formik.values.parent_id}
                                        onChange={formik.handleChange}
                                        sx={{ borderRadius: "4px" }}
                                    >
                                        <MenuItem value={0}>Select Parent</MenuItem>
                                        {parents.map((parent) => (
                                            <MenuItem key={parent.id} value={parent.id}>
                                                {parent.de_no} - {parent.name_de}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>TARIC Code</Typography>
                                    <Select
                                        id="taric_id"
                                        name="taric_id"
                                        value={formik.values.taric_id}
                                        onChange={formik.handleChange}
                                        sx={{ borderRadius: "4px" }}
                                    >
                                        <MenuItem value={0}>Select TARIC</MenuItem>
                                        {tarics.map((taric) => (
                                            <MenuItem key={taric.id} value={taric.id}>
                                                {taric.code} - {taric.name_en}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>Category</Typography>
                                    <Select
                                        id="cat_id"
                                        name="cat_id"
                                        value={formik.values.cat_id}
                                        onChange={formik.handleChange}
                                        sx={{ borderRadius: "4px" }}
                                    >
                                        <MenuItem value={0}>Select Category</MenuItem>
                                        {categories.map((cat) => (
                                            <MenuItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 4, mt: 3, borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <LucideImage size={20} color="#8CC21B" />
                            Assets & Media
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="photo"
                                    name="photo"
                                    label="Shop Photo URL"
                                    value={formik.values.photo}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    id="pix_path_eBay"
                                    name="pix_path_eBay"
                                    label="eBay Pictures Path"
                                    value={formik.values.pix_path_eBay}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 4, mt: 3, borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <LucideFileText size={20} color="#8CC21B" />
                            Remarks & Notes
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    id="remark"
                                    name="remark"
                                    label="General Remarks"
                                    value={formik.values.remark}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    id="npr_remark"
                                    name="npr_remark"
                                    label="NPR Remark"
                                    value={formik.values.npr_remark}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: "4px", border: "1px solid #e0e0e0", mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <LucideSettings size={20} color="#8CC21B" />
                            Item Settings
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <FormControlLabel
                                control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} color="primary" />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active Status</Typography>}
                            />
                            <FormControlLabel
                                control={<Switch checked={formik.values.is_qty_dividable} onChange={(e) => formik.setFieldValue("is_qty_dividable", e.target.checked)} color="primary" />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Quantity Dividable</Typography>}
                            />
                            <FormControlLabel
                                control={<Switch checked={formik.values.is_npr} onChange={(e) => formik.setFieldValue("is_npr", e.target.checked)} color="primary" />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>NPR Status</Typography>}
                            />
                            <FormControlLabel
                                control={<Switch checked={formik.values.is_eur_special} onChange={(e) => formik.setFieldValue("is_eur_special", e.target.checked)} color="primary" />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>EUR Special</Typography>}
                            />
                            <FormControlLabel
                                control={<Switch checked={formik.values.is_rmb_special} onChange={(e) => formik.setFieldValue("is_rmb_special", e.target.checked)} color="primary" />}
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>RMB Special</Typography>}
                            />
                        </Box>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 4, borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <LucideInfo size={20} color="#8CC21B" />
                            Dimensions & Weight
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    id="weight"
                                    name="weight"
                                    label="Weight"
                                    type="number"
                                    value={formik.values.weight}
                                    onChange={formik.handleChange}
                                    InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    fullWidth
                                    id="length"
                                    name="length"
                                    label="L"
                                    type="number"
                                    value={formik.values.length}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    fullWidth
                                    id="width"
                                    name="width"
                                    label="W"
                                    type="number"
                                    value={formik.values.width}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    fullWidth
                                    id="height"
                                    name="height"
                                    label="H"
                                    type="number"
                                    value={formik.values.height}
                                    onChange={formik.handleChange}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Dimensions are in centimeters (cm).
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EditItemPage;
