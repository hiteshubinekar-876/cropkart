# Phase 4 Migration Baseline

Captured before any source files were copied into the new monorepo. Original source repositories remain untouched.

## Source state

Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
Local machine-specific path omitted.
- Source `.env` files, local dependency folders, and running services are not part of the copy baseline and will not be copied.

## Important source-file SHA-256 baseline

| Source file | SHA-256 |
|---|---|
| GreenCart `.env.example` | `4F76F0C7A9338580769314585F144FD0AE4BF031BD22761C32B730AA82BC36BE` |
| GreenCart `app/chat/page.tsx` | `7E1F3E161F922F37E89D714161E386F86BCF0F240D7189E2C458BB3A3103B5AC` |
| GreenCart `components/chat/chat-assistant.tsx` | `9E01411B9671ACE51B4AA538071551C8CAD7F63F5C5D416ABCA502CBCC6BDAA2` |
| GreenCart `lib/types.ts` | `1D0ABE23255D5859FA886B7FF496516CF91197B62DBA3EC39F011E6EB2B16DC5` |
| GreenCart nested-only `app/auctions/[id]/page.tsx` | `55E1BC54146DC13F99A300F8DE6D3A9F37C80E26AD7B26457D86B84477DBEB63` |
| GreenCart nested-only `app/products/[slug]/page.tsx` | `823EEAB840F115D8788387F9943045A3FF4300412EED4F9862B36ABC30D26F10` |
| GreenCart nested `components/chat/chat-assistant.tsx` | `868DDDC1A1009C5B95C58521E85567B43D87CA0C4C995E47125D0F5D5EA231BD` |
| GreenCart nested `.env.example` | `DBB53A2A3B9CA1CF1D3FF9B3BF7228646D09B97376D1BB3114AB9C0EB0A32BEA` |
| Backend `app/main.py` | `3164D670397D9E7534629B190A8E11793B94084AD197B448460434836FB4BB31` |
| Backend `app/services/ceda_service.py` | `79CDC25518249D1853227C95C25E521E0AA977910D27A4DCFC73E7B1C119DECF` |
| Backend `app/services/market_data_ingestion.py` | `9DF4CEA671EF77ED9671991D34F280433DFF8F6D17A064CA292B200A491637C8` |
| Backend `scripts/import_market_data.py` | `7E876A58B43C6CCE3050135AD57ADACC18E06AC49A9AFF170B5404B25DEF7790` |
| Backend `Dockerfile` | `53D18E90A8946AF9F48B30DC7320B0DE782A62E2B90A9436F46765AE6EBB19AF` |
| CropKart migration `20260925_cropkart_core.sql` | `C533E59768A5E92CF19A6CCE504517C3AE1C0027F34DDDD3069887A9A70F39CE` |
| CropKart migration `20260929_fix_uuid_integer_keys.sql` | `E238A3A1BC3314771C619E0A3F1C3D3B70CF763D79465D12E2CCDB77EC9B263A` |
| CropKart `supabase/seed.sql` | `C5A8B8F83CAFDBABDF5EA5513DDA689D6E96302EE685AE0192FD31AE80D65A08` |
| LangFlow `flows/cropsathi_flow.json` | `D45080D3A760E8D1707CFACAEE3F863C8B4DB1E41F95B1EB9305398143159A14` |
| LangFlow root compose | `0C407990B170E5D10F25B791F0C4BE589960B1150CD5AD65173680BD42D231AA` |
| LangFlow Docker compose | `8C3254785B355FE3352A67E275725677DFCE692E3C89D0B0A6416D21160BFF3E` |

Hashes identify the source snapshots only; the migration copies are validated separately after copying. This is a focused manifest of key/changed sources, not a hash inventory of ignored dependencies or `.env` files.
