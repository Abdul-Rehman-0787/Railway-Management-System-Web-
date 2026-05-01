import React from 'react';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>🚂 Railway Management System</h3>
                    <p>Safe, Comfortable, and Reliable Travel Across Pakistan</p>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                        ⭐ Rated 4.8/5 by 10,000+ passengers
                    </p>
                </div>
                
                <div className="footer-section">
                    <h4>🔗 Quick Links</h4>
                    <ul>
                        <li><a href="/schedules">📅 Train Schedules</a></li>
                        <li><a href="/catalogue">📚 Train Catalogue</a></li>
                        <li><a href="/ratings">⭐ Ratings & Reviews</a></li>
                        <li><a href="/contact">📞 Contact Us</a></li>
                    </ul>
                </div>
                
                <div className="footer-section">
                    <h4>📞 Contact Info</h4>
                    <p>📱 +92 318 4396992</p>
                    <p>✉️ support@railway.com</p>
                    <p>🌐 www.railway.gov.pk</p>
                    <p>📍 Lahore, Pakistan</p>
                    <p>🕒 24/7 Customer Support</p>
                </div>
                
                <div className="footer-section">
                    <h4>🌐 Follow Us</h4>
                    <div className="social-links">
                        <a href="https://www.facebook.com/share/1ZA5aN39t4/" target="_blank" rel="noopener noreferrer">
                            📘 Facebook
                        </a>
                        <a href="https://www.threads.net/@abdul_rehman__19" target="_blank" rel="noopener noreferrer">
                            🧵 Threads
                        </a>
                        <a href="https://www.instagram.com/abdul_rehman__19" target="_blank" rel="noopener noreferrer">
                            📸 Instagram
                        </a>
                        <a href="https://github.com/Abdul-Rehman-0787/" target="_blank" rel="noopener noreferrer">
                            🐙 GitHub
                        </a>
                        <a href="https://www.linkedin.com/in/abdul-rehman-naseer-881712282" target="_blank" rel="noopener noreferrer">
                            💼 LinkedIn
                        </a>
                    </div>
                </div>
            </div>
            
            <div className="footer-bottom">
                <p>© 2024 Railway Management System. All rights reserved.</p>
                <p>🚆 Developed with ❤️ by Team RMS | Safe Journeys, Happy Memories 🚆</p>
                <p style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
                    Version 2.0 | Last Updated: May 2025
                </p>
            </div>
        </footer>
    );
}

export default Footer;