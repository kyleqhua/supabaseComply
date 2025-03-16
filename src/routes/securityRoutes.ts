import express, { Request, Response } from "express";
import { adminSupabase } from "../config/supabaseClient";

const router = express.Router();

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


/**
 * @route GET /security/mfa
 * @desc Check if MFA is enabled for all users
 */
router.get("/mfa", async (req: Request, res: Response): Promise<any> => {
    try {
        const { data: users, error } = await adminSupabase.auth.admin.listUsers();

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        const results = users.users.map(user => ({
            email: user.email,
            mfa_enabled: user.factors ? user.factors.length > 0 : false,
        }));

        res.json({ users: results });
    } catch (err) {
        console.error("Error in /mfa route:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * @route GET /security/rls
 * @desc Check if Row Level Security (RLS) is enabled on all tables
 */
router.get("/rls", async (req: Request, res: Response): Promise<any> => {
    try {
        const response = await fetch(
            `https://api.supabase.com/v1/projects/espvtfvcbrkjwlrljpyc/database/query`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                query: `
                  SELECT tablename, rowsecurity
                  FROM pg_catalog.pg_tables
                  WHERE schemaname = 'public';
                `,
              }),
            }
          );
      
          // Parse the response
          const data = await response.json();
      
          // Send the response back to the client
          res.json(data);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @route GET /security/pitr
 * @desc Check if Point-in-Time Recovery (PITR) is enabled
 */
router.get("/pitr", async (req: Request, res: Response): Promise<any> => {
    try {
        const { data: projects, error } = await adminSupabase
            .from("supabase_projects")
            .select("id, name, pitr_enabled");

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        const results = projects.map(project => ({
            project: project.name,
            pitr_enabled: project.pitr_enabled
        }));

        res.json({ projects: results });
    } catch (err) {
        console.error("Error in /pitr route:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

export default router;