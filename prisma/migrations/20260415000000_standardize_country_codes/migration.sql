-- Standardize country codes to ISO 3166-1 alpha-2
UPDATE "Property" SET country = 'PT' WHERE country = 'Portugal';
UPDATE "Property" SET country = 'ES' WHERE country = 'Spain';
