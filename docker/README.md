# Deployment notes

The root Compose file builds the FastAPI service and runs LangFlow against the existing external cropkart-langflow-data volume. It intentionally has no local Postgres service: DATABASE_URL points at the managed Supabase database.

Do not run Compose while another project owns host ports 8001 or 7860. The current machine has existing services on these ports. The external volume declaration prevents Compose from silently creating a separate LangFlow state volume. Review env templates and backups before any planned service replacement; this migration does not start, stop, or recreate containers.
