-- Align the legacy market_data table definition with the live schema consumed
-- by backend.app.models.market_data. All operations preserve existing rows.
DO $$
BEGIN
    IF to_regclass('public.market_data') IS NULL THEN
        RAISE EXCEPTION 'public.market_data does not exist; apply the core schema first';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'mandi'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'market_name'
    ) THEN
        ALTER TABLE public.market_data RENAME COLUMN mandi TO market_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'record_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'arrival_date'
    ) THEN
        ALTER TABLE public.market_data RENAME COLUMN record_date TO arrival_date;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'minimum_price'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'min_price'
    ) THEN
        ALTER TABLE public.market_data RENAME COLUMN minimum_price TO min_price;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'maximum_price'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'market_data' AND column_name = 'max_price'
    ) THEN
        ALTER TABLE public.market_data RENAME COLUMN maximum_price TO max_price;
    END IF;
END $$;

ALTER TABLE public.market_data
    ADD COLUMN IF NOT EXISTS crop_id UUID,
    ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(20) NOT NULL DEFAULT 'quintal',
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'agmarknet';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.market_data'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid = 'public.market_data'::regclass
                                AND attname = 'crop_id')]::smallint[]
    ) THEN
        ALTER TABLE public.market_data
            ADD CONSTRAINT market_data_crop_id_fkey
            FOREIGN KEY (crop_id) REFERENCES public.crops(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.market_data
        WHERE arrival_quantity IS NULL OR min_price IS NULL OR max_price IS NULL OR modal_price IS NULL
    ) THEN
        RAISE EXCEPTION 'market_data contains NULL values in fields required by the FastAPI model; review rows before enforcing NOT NULL';
    END IF;
END $$;

ALTER TABLE public.market_data
    ALTER COLUMN arrival_quantity SET DEFAULT 0,
    ALTER COLUMN arrival_quantity SET NOT NULL,
    ALTER COLUMN min_price SET NOT NULL,
    ALTER COLUMN max_price SET NOT NULL,
    ALTER COLUMN modal_price SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_market_data_comm_market_date
    ON public.market_data (commodity, market_name, arrival_date);
CREATE INDEX IF NOT EXISTS ix_market_data_state_district
    ON public.market_data (state, district);
CREATE UNIQUE INDEX IF NOT EXISTS uq_market_data_dedup
    ON public.market_data (
        commodity,
        market_name,
        COALESCE(variety, ''),
        COALESCE(grade, ''),
        arrival_date
    );
