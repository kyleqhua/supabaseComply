import express, { Request, Response } from "express";
import { adminSupabase } from "../config/supabaseClient";

const router = express.Router();

const BEARER_TOKEN = process.env.BEARER_TOKEN;


/**
 * @desc Check if MFA is enabled for all users
 */
router.get("/mfa", async (req: Request, res: Response): Promise<any> => {
    try {
        // Get a list of all users
        const { data: users, error } = await adminSupabase.auth.admin.listUsers();

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        // user.factors will be an array if MFA is enabled showing the MFA methods a user has enabled
        //if user.factors is empty, then MFA is not enabled
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
 * @desc Check if Row Level Security (RLS) is enabled on all tables
 */
router.get("/rls", async (req: Request, res: Response): Promise<any> => {
    try {
        // Make a request to the Supabase API with a sql query to check if RLS is enabled
        const response = await fetch(
            `https://api.supabase.com/v1/projects/espvtfvcbrkjwlrljpyc/database/query`,
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
 * @desc Check if Point-in-Time Recovery (PITR) is enabled
 */
router.get("/pitr", async (req: Request, res: Response): Promise<any> => {
    try {
      //api call to get all projects 
      const projs = await getProjects();
      //filters out the project ids
      const projectids = getProjectIds(projs);
      
      //iterate through each id and check if PITR is enabled by calling the  projects backups api
      const results = []; // Array to store the results
      for (let i = 0; i < projectids.length; i++) {
        const ref = projectids[i];
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
        const pitrEnabled = data.pitr_enabled || false; // Default to false if not present

        // Add the result to the array
        results.push({
          projectid: ref,
          pitr_enabled: pitrEnabled,
        });
      }
      
      // Send the response back to the client
      res.json(results);

    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
});

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
    return projs
    

  } catch (err) {
    console.error("Error in /mfa route:", err);
    return Error("Internal server error.");
}
  }


function getProjectIds(projects: any) {
    // Extract project IDs from the projects JSON
    const projectIds = projects.map((project: any) => project.id);
  
    // Send the project IDs back to the client
    console.log(projectIds);
    return projectIds;
  }

export default router;