// admin/app/dashboard/Dashboard.tsx
import AdminCustomersPage from "../scheduled/lists/page";
import AdminListDetailPage from "../scheduled/lists/[id]/page";
import AdminAllItemsPage from "../scheduled/page";

export default function Dashboard() {
    return (
        <div>
            <h1>Dashboard</h1>
            <section>
                <h2>All Items</h2>
                <AdminAllItemsPage />
            </section>
            <section>
                <h2>Customers</h2>
                <AdminCustomersPage />
            </section>
            <section>
                <h2>List Details</h2>
                <AdminListDetailPage />
            </section>
        </div>
    );
}
