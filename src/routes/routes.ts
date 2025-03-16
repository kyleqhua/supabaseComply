import express, { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

const BEARER_TOKEN = process.env.BEARER_TOKEN;

const projectsRefs = {
  [process.env.PROJECT_1_REF!]: process.env.PROJECT_1_SERVICE_ROLE_KEY,
  [process.env.PROJECT_2_REF!]: process.env.PROJECT_2_SERVICE_ROLE_KEY,
  // Add more projects here
};

function createSupabaseClient(projectRef: string) {
  const serviceRoleKey = projectsRefs[projectRef];
  if (!serviceRoleKey) {
      throw new Error(`Service role key not found for project: ${projectRef}`);
  }

  const supabaseUrl = `https://${projectRef}.supabase.co`;
  return createClient(supabaseUrl, serviceRoleKey);
};

/**
 * @desc Check if MFA is enabled for all users
 */
router.get("/mfa", async (req: Request, res: Response): Promise<any> => {
    try {
      var allUsers: { [key: string]: any } = {};
        for (const [projectRef, serviceRoleKey] of Object.entries(projectsRefs)) {
          console.log(projectRef, serviceRoleKey);
          const currClient = createSupabaseClient(projectRef);
          const { data, error } = await currClient.auth.admin.listUsers();
          console.log(data, error);
          const results = data.users.map(user => ({
            email: user.email,
            mfa_enabled: user.factors ? user.factors.length > 0 : false,
        }));
          allUsers[projectRef] = results;
        }

        console.log(allUsers);
     
        // Get a list of all users
        //I NEED THIS LINE TO WORK WHY
       // const { data: users, error } = await adminSupabase.auth.admin.listUsers(); 

        res.json({ users: allUsers });
    } catch (err) {
        console.error("Error in /mfa route:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * @desc Check if Row Level Security (RLS) is enabled on all tables
 */
router.get("/rls", async (req: Request, res: Response): Promise<any> => {
    try {
      var allTables: { [key: string]: any } = {};
      for (const [projectRef, serviceRoleKey] of Object.entries(projectsRefs)) {
        // Make a request to the Supabase API with a SQL query to check if RLS is enabled
        const response = await fetch(
            `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${BEARER_TOKEN}`,
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
      

        const data = await response.json();
        console.log("API Response for project", projectRef, ":", data);

        // Extract the table objects from the data
        const tables = Object.values(data);

        // Store the tables under the projectRef key
        allTables[projectRef] = tables;

      }
        // Send the response back to the client
        res.json(allTables);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @desc Check if Point-in-Time Recovery (PITR) is enabled
 */
router.get("/pitr", async (req: Request, res: Response): Promise<any> => {
    try {
        // Fetch all projects
        const projs = await getProjects();
        // Extract project IDs
        const projectids = projs.map((project: any) => project.id)


        // Check PITR status for each project
        const results = await Promise.all(
            projectids.map(async (ref: string) => {
                const response = await fetch(
                    `https://api.supabase.com/v1/projects/${ref}/database/backups`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${BEARER_TOKEN}`,
                        },
                    }
                );

                const data = await response.json();
                return {
                    projectid: ref,
                    pitr_enabled: data.pitr_enabled || false, // Default to false if not present
                };
            })
        );

        // Send the response back to the client
        res.json(results);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Utility function to fetch all projects
 */
async function getProjects() {
    try {
        const response = await fetch(
            `https://api.supabase.com/v1/projects`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${BEARER_TOKEN}`,
                },
            }
        );

        const projs = await response.json();
        return projs;
    } catch (err) {
        console.error("Error fetching projects:", err);
        throw new Error("Failed to fetch projects.");
    }
}


export default router;
