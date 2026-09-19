-- =========================================================
-- PORTAL RT
-- Database Schema
-- Version: 1.0
-- =========================================================

-- =========================================================
-- EXTENSION
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================================================
-- USERS
-- Untuk login Web Admin
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,

    name VARCHAR(150) NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'operator'
        CHECK (role IN (
            'super_admin',
            'ketua_rt',
            'operator',
            'admin_pkk',
            'admin_remaja'
        )),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- PENGURUS
-- Struktur Pengurus RT
-- =========================================================

CREATE TABLE IF NOT EXISTS pengurus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nama VARCHAR(150) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,

    foto_file_id TEXT,

    deskripsi TEXT,

    urutan INTEGER NOT NULL DEFAULT 0,

    periode_mulai DATE,
    periode_selesai DATE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- PENGUMUMAN
-- Informasi/pengumuman untuk warga
-- =========================================================

CREATE TABLE IF NOT EXISTS pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    judul VARCHAR(255) NOT NULL,

    slug VARCHAR(255) NOT NULL UNIQUE,

    isi TEXT NOT NULL,

    kategori VARCHAR(50) NOT NULL DEFAULT 'umum',

    prioritas VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (prioritas IN (
            'normal',
            'penting',
            'darurat'
        )),

    tanggal_mulai DATE,
    tanggal_selesai DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'published',
            'archived'
        )),

    author_id UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- AGENDA
-- Kalender kegiatan
-- =========================================================

CREATE TABLE IF NOT EXISTS agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    judul VARCHAR(255) NOT NULL,

    deskripsi TEXT,

    tanggal DATE NOT NULL,

    waktu_mulai TIME,
    waktu_selesai TIME,

    lokasi VARCHAR(255),

    kategori VARCHAR(50) NOT NULL DEFAULT 'RT',

    status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (status IN (
            'draft',
            'published',
            'cancelled',
            'completed'
        )),

    created_by UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- KEGIATAN
-- PKK, Remaja, 17 Agustus, dan lainnya
-- =========================================================

CREATE TABLE IF NOT EXISTS kegiatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    judul VARCHAR(255) NOT NULL,

    slug VARCHAR(255) NOT NULL UNIQUE,

    kategori VARCHAR(50) NOT NULL
        CHECK (kategori IN (
            'PKK',
            'REMAJA',
            '17_AGUSTUS',
            'LAINNYA'
        )),

    deskripsi TEXT,

    tanggal DATE,

    lokasi VARCHAR(255),

    cover_file_id TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'published',
            'archived'
        )),

    author_id UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- GALERI
-- Album foto
-- =========================================================

CREATE TABLE IF NOT EXISTS galeri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nama_album VARCHAR(255) NOT NULL,

    slug VARCHAR(255) NOT NULL UNIQUE,

    deskripsi TEXT,

    tanggal DATE,

    kategori VARCHAR(50) NOT NULL DEFAULT 'LAINNYA',

    cover_file_id TEXT,

    kegiatan_id UUID REFERENCES kegiatan(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (status IN (
            'draft',
            'published',
            'archived'
        )),

    created_by UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- FOTO
-- Referensi foto yang disimpan di Google Drive
-- =========================================================

CREATE TABLE IF NOT EXISTS foto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    galeri_id UUID NOT NULL REFERENCES galeri(id)
        ON DELETE CASCADE,

    google_drive_file_id TEXT NOT NULL,

    file_name VARCHAR(255),

    mime_type VARCHAR(100),

    thumbnail_url TEXT,

    caption TEXT,

    urutan INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- VIDEO
-- Video YouTube
-- =========================================================

CREATE TABLE IF NOT EXISTS video (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    judul VARCHAR(255) NOT NULL,

    deskripsi TEXT,

    youtube_id VARCHAR(100) NOT NULL,

    thumbnail_url TEXT,

    kategori VARCHAR(50) NOT NULL DEFAULT 'LAINNYA',

    tanggal DATE,

    kegiatan_id UUID REFERENCES kegiatan(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (status IN (
            'draft',
            'published',
            'archived'
        )),

    urutan INTEGER NOT NULL DEFAULT 0,

    created_by UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- INFORMASI DARURAT
-- Kontak penting
-- =========================================================

CREATE TABLE IF NOT EXISTS informasi_darurat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    judul VARCHAR(150) NOT NULL,

    deskripsi TEXT,

    kategori VARCHAR(50) NOT NULL DEFAULT 'LAINNYA',

    kontak VARCHAR(150),

    nomor VARCHAR(50),

    url TEXT,

    urutan INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- SETTINGS
-- Pengaturan website dan statistik RT
-- =========================================================

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    key VARCHAR(100) NOT NULL UNIQUE,

    value TEXT,

    description TEXT,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- INDEX
-- Untuk mempercepat pencarian
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_pengumuman_status
    ON pengumuman(status);

CREATE INDEX IF NOT EXISTS idx_pengumuman_tanggal
    ON pengumuman(tanggal_mulai);

CREATE INDEX IF NOT EXISTS idx_agenda_tanggal
    ON agenda(tanggal);

CREATE INDEX IF NOT EXISTS idx_agenda_status
    ON agenda(status);

CREATE INDEX IF NOT EXISTS idx_kegiatan_kategori
    ON kegiatan(kategori);

CREATE INDEX IF NOT EXISTS idx_kegiatan_tanggal
    ON kegiatan(tanggal);

CREATE INDEX IF NOT EXISTS idx_kegiatan_status
    ON kegiatan(status);

CREATE INDEX IF NOT EXISTS idx_galeri_kategori
    ON galeri(kategori);

CREATE INDEX IF NOT EXISTS idx_galeri_kegiatan
    ON galeri(kegiatan_id);

CREATE INDEX IF NOT EXISTS idx_foto_galeri
    ON foto(galeri_id);

CREATE INDEX IF NOT EXISTS idx_video_kegiatan
    ON video(kegiatan_id);

CREATE INDEX IF NOT EXISTS idx_video_kategori
    ON video(kategori);

CREATE INDEX IF NOT EXISTS idx_informasi_darurat_kategori
    ON informasi_darurat(kategori);


-- =========================================================
-- DEFAULT SETTINGS
-- =========================================================

INSERT INTO settings (key, value, description)
VALUES
    ('site_name', 'Portal RT', 'Nama website RT'),
    ('site_description', 'Portal Informasi Warga', 'Deskripsi website'),
    ('rt_name', 'RT 00', 'Nomor RT'),
    ('rw_name', 'RW 00', 'Nomor RW'),
    ('desa_name', '', 'Nama desa/kelurahan'),
    ('kecamatan_name', '', 'Nama kecamatan'),
    ('kabupaten_name', '', 'Nama kabupaten/kota'),
    ('provinsi_name', '', 'Nama provinsi'),
    ('slogan', 'Guyub, Rukun, Bersama', 'Slogan RT'),
    ('logo_file_id', '', 'Google Drive File ID logo'),
    ('template', 'modern', 'Template website aktif'),
    ('total_warga', '0', 'Total warga'),
    ('total_keluarga', '0', 'Total keluarga'),
    ('total_laki_laki', '0', 'Jumlah warga laki-laki'),
    ('total_perempuan', '0', 'Jumlah warga perempuan'),
    ('total_anak', '0', 'Jumlah anak'),
    ('total_remaja', '0', 'Jumlah remaja'),
    ('total_dewasa', '0', 'Jumlah dewasa'),
    ('total_lansia', '0', 'Jumlah lansia')
ON CONFLICT (key) DO NOTHING;


-- =========================================================
-- TRIGGER UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_pengurus_updated_at
BEFORE UPDATE ON pengurus
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_pengumuman_updated_at
BEFORE UPDATE ON pengumuman
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_agenda_updated_at
BEFORE UPDATE ON agenda
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_kegiatan_updated_at
BEFORE UPDATE ON kegiatan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_galeri_updated_at
BEFORE UPDATE ON galeri
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_video_updated_at
BEFORE UPDATE ON video
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_informasi_darurat_updated_at
BEFORE UPDATE ON informasi_darurat
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
