-- NeighborLink Database Schema
CREATE DATABASE IF NOT EXISTS neighborlink;
USE neighborlink;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'provider') DEFAULT 'user',
  phone VARCHAR(20),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service providers profile
CREATE TABLE IF NOT EXISTS providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  bio TEXT,
  experience_years INT DEFAULT 0,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  total_jobs INT DEFAULT 0,
  completed_jobs INT DEFAULT 0,
  response_time_minutes INT DEFAULT 30,
  trust_score DECIMAL(4,2) DEFAULT 5.00,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Bookings table
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
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  price_estimate DECIMAL(10,2),
  final_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  provider_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),
  punctuality_rating INT CHECK (punctuality_rating BETWEEN 1 AND 5),
  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200),
  message TEXT,
  type ENUM('booking', 'review', 'system') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed categories
INSERT IGNORE INTO categories (id, name, icon, description) VALUES
(1, 'Electrician', '⚡', 'Electrical repairs, wiring, installations'),
(2, 'Plumber', '🔧', 'Pipe repairs, installations, drainage'),
(3, 'Carpenter', '🪚', 'Furniture repair, woodwork, installations'),
(4, 'Cleaner', '🧹', 'Home cleaning, deep cleaning, office'),
(5, 'Painter', '🎨', 'Interior/exterior painting, wall texture'),
(6, 'AC Repair', '❄️', 'AC servicing, repair, installation'),
(7, 'Appliance Repair', '🔌', 'Washing machine, fridge, TV repair'),
(8, 'Security', '🔒', 'CCTV, locks, security systems');

-- Seed demo users (password: password123)
INSERT IGNORE INTO users (id, name, email, password, role, phone, address, latitude, longitude) VALUES
(1, 'Arjun Kumar', 'arjun@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9876543210', '12 MG Road, Vellore', 12.9165, 79.1325),
(2, 'Ramesh Electricals', 'ramesh@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543211', 'Katpadi, Vellore', 12.9718, 79.1329),
(3, 'Priya Plumbing', 'priya@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543212', 'Sathuvachari, Vellore', 12.9341, 79.1327),
(4, 'Suresh Carpenter', 'suresh@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543213', 'Gandhi Nagar, Vellore', 12.9200, 79.1340),
(5, 'Meena Cleaning', 'meena@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543214', 'Bagayam, Vellore', 12.9100, 79.1500);

INSERT IGNORE INTO providers (id, user_id, category_id, bio, experience_years, hourly_rate, is_available, latitude, longitude, address, total_jobs, completed_jobs, response_time_minutes, trust_score, avg_rating) VALUES
(1, 2, 1, 'Expert electrician with 8 years experience. Specialized in residential wiring and repairs.', 8, 350, TRUE, 12.9718, 79.1329, 'Katpadi, Vellore', 127, 124, 15, 9.2, 4.8),
(2, 3, 2, 'Professional plumber serving Vellore since 2015. Quick response guaranteed.', 9, 300, TRUE, 12.9341, 79.1327, 'Sathuvachari, Vellore', 98, 95, 20, 8.8, 4.6),
(3, 4, 3, 'Skilled carpenter for all your woodwork needs. Furniture assembly specialist.', 12, 400, FALSE, 12.9200, 79.1340, 'Gandhi Nagar, Vellore', 156, 150, 30, 9.5, 4.9),
(4, 5, 4, 'Professional home cleaning service. Eco-friendly products used.', 5, 250, TRUE, 12.9100, 79.1500, 'Bagayam, Vellore', 203, 200, 10, 9.1, 4.7);
