
import { AppDataSource } from "../config/database";

export const fixSequences = async () => {
    try {
        console.log("🔄 Resetting database sequences...");
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        const sql = `
            DO $$
            DECLARE
                r RECORD;
                seq_name TEXT;
                max_id BIGINT;
            BEGIN
                FOR r IN (
                    SELECT table_name, column_name, column_default 
                    FROM information_schema.columns 
                    WHERE column_default LIKE 'nextval%' 
                    AND table_schema = 'public'
                ) LOOP
                    seq_name := substring(r.column_default from 'nextval\\(''(.*)''::regclass\\)');
                    
                    EXECUTE format('SELECT MAX(%I) FROM %I', r.column_name, r.table_name) INTO max_id;
                    
                    IF max_id IS NOT NULL THEN
                        EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id);
                        RAISE NOTICE 'Reset sequence % for table % to %', seq_name, r.table_name, max_id;
                    END IF;
                END LOOP;
            END $$;
        `;

        await queryRunner.query(sql);
        await queryRunner.release();
        console.log("✅ Database sequences reset successfully!");
    } catch (error) {
        console.error("❌ Error resetting sequences:", error);
    }
};
