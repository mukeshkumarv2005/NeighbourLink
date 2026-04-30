-- NeighborLink Database Schema
-- Run this file to set up the MySQL database

CREATE DATABASE IF NOT EXISTS neighborlink;
USE neighborlink;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'provider') NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  address VARCHAR(200),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Providers Table (linked to users with role='provider')
CREATE TABLE IF NOT EXISTS providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  bio TEXT,
  experience_years INT DEFAULT 0,
  hourly_rate DECIMAL(10, 2) DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  trust_score DECIMAL(4, 2) DEFAULT 0,
  total_jobs INT DEFAULT 0,
  completed_jobs INT DEFAULT 0,
  response_time_minutes INT DEFAULT 30,
  is_available BOOLEAN DEFAULT TRUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider_id INT NOT NULL,
  category_id INT NOT NULL,
  service_description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_estimate DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  provider_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert Sample Categories
INSERT INTO categories (name, icon, description) VALUES
('Electrician', '⚡', 'Electrical repairs, wiring, installation'),
('Plumber', '🔧', 'Pipe repairs, leaks, installations'),
('Carpenter', '🪛', 'Furniture, woodwork, fixtures'),
('Cleaner', '🧹', 'Home and office cleaning'),
('AC Repair', '❄️', 'Air conditioning service and repair'),
('Painter', '🎨', 'Interior and exterior painting'),
('Mechanic', '🔩', 'Vehicle and equipment repair'),
('Gardener', '🌿', 'Lawn care and gardening'),
('Security', '🔒', 'CCTV and security systems'),
('IT Support', '💻', 'Computer and tech support');

-- Insert Sample Users (password: "password123" bcrypt hashed)
INSERT INTO users (name, email, password, role, phone, address, latitude, longitude) VALUES
('Ramesh Kumar', 'ramesh@demo.com', '$2a$10$90TrKLnx.0iUmuSN1b5L5OMHELAU.3XTbmyNxWEhE5zI6WKZZKy1a', 'provider', '9876543210', 'Kātpādi, Tamil Nadu', 12.9716, 79.1348),
('Priya Sharma', 'priya@demo.com', '$2a$10$90TrKLnx.0iUmuSN1b5L5OMHELAU.3XTbmyNxWEhE5zI6WKZZKy1a', 'provider', '9876543211', 'Vellore, Tamil Nadu', 12.9165, 79.1325),
('Arjun Singh', 'arjun@demo.com', '$2a$10$90TrKLnx.0iUmuSN1b5L5OMHELAU.3XTbmyNxWEhE5zI6WKZZKy1a', 'provider', '9876543212', 'Kātpādi, Tamil Nadu', 12.9800, 79.1400),
('Meena Raj', 'meena@demo.com', '$2a$10$90TrKLnx.0iUmuSN1b5L5OMHELAU.3XTbmyNxWEhE5zI6WKZZKy1a', 'provider', '9876543213', 'Vellore, Tamil Nadu', 12.9100, 79.1200),
('Demo User', 'user@demo.com', '$2a$10$90TrKLnx.0iUmuSN1b5L5OMHELAU.3XTbmyNxWEhE5zI6WKZZKy1a', 'user', '9876543214', 'Kātpādi, Tamil Nadu', 12.9716, 79.1348);

-- Insert Sample Providers
INSERT INTO providers (user_id, category_id, bio, experience_years, hourly_rate, avg_rating, trust_score, total_jobs, completed_jobs, latitude, longitude) VALUES
(1, 1, 'Expert in home wiring, switchboard repairs, and electrical installations. Certified electrician with 8 years of field experience.', 8, 350.00, 4.80, 8.50, 45, 42, 12.9716, 79.1348),
(2, 2, 'Professional plumber specializing in leak repairs, pipe fitting, bathroom fittings and drainage work.', 6, 300.00, 4.50, 7.80, 38, 35, 12.9165, 79.1325),
(3, 3, 'Master carpenter with expertise in furniture repair, door/window work, and custom woodwork.', 10, 400.00, 4.90, 9.20, 60, 58, 12.9800, 79.1400),
(4, 4, 'Professional cleaning service offering full home cleaning, kitchen scrubbing, and bathroom sanitization.', 4, 250.00, 4.30, 7.20, 30, 28, 12.9100, 79.1200);

-- Insert Sample Bookings
INSERT INTO bookings (user_id, provider_id, category_id, service_description, scheduled_date, scheduled_time, status, address, price_estimate) VALUES
(5, 1, 1, 'Fix faulty wiring in kitchen', '2025-12-01', '10:00:00', 'completed', '12 MG Road, Vellore', 700.00),
(5, 2, 2, 'Fix leaking bathroom pipe', '2025-12-05', '09:00:00', 'completed', '12 MG Road, Vellore', 600.00),
(5, 3, 3, 'Door frame repair', '2025-12-10', '14:00:00', 'accepted', '12 MG Road, Vellore', 800.00);

-- Insert Sample Reviews
INSERT INTO reviews (booking_id, user_id, provider_id, rating, quality_rating, punctuality_rating, communication_rating, review_text) VALUES
(1, 5, 1, 5, 5, 5, 4, 'Excellent work! Fixed all electrical issues quickly and professionally.'),
(2, 5, 2, 4, 4, 4, 5, 'Good plumbing work. Neat and tidy. Came on time.');
