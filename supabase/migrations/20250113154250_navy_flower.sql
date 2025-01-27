/*
  # Create companies table and relationships

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `contact` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)
      - `updated_at` (timestamp)

  2. New Tables for Relationships
    - `company_tails`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `tail_number` (text, required)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Company tails table
CREATE TABLE company_tails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies NOT NULL,
  tail_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, tail_number)
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tails ENABLE ROW LEVEL SECURITY;

-- Policies for companies
CREATE POLICY "Users can read all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for company_tails
CREATE POLICY "Users can read all company tails"
  ON company_tails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage company tails"
  ON company_tails FOR ALL
  TO authenticated
  USING (true);