"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixSequences = void 0;
const database_1 = require("../config/database");
const fixSequences = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🔄 Resetting database sequences...");
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
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
        yield queryRunner.query(sql);
        yield queryRunner.release();
        console.log("✅ Database sequences reset successfully!");
    }
    catch (error) {
        console.error("❌ Error resetting sequences:", error);
    }
});
exports.fixSequences = fixSequences;
