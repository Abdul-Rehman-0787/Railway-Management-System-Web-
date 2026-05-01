import React, { useState, useEffect } from 'react';
import { publicAPI } from '../api';
import { FaTrain, FaWifi, FaUtensils, FaChair, FaPlug, FaSnowflake } from 'react-icons/fa';
import './Catalogue.css';

function Catalogue() {
    const [catalogue, setCatalogue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCatalogue();
    }, []);

    const fetchCatalogue = async () => {
        try {
            const response = await publicAPI.getCatalogue();
            if (response.data.success) {
                setCatalogue(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch catalogue');
        } finally {
            setLoading(false);
        }
    };

    const getAmenities = (trainType) => {
        const amenities = {
            Express: [<FaWifi key="wifi" />, <FaUtensils key="food" />, <FaChair key="seat" />, <FaPlug key="plug" />],
            Local: [<FaChair key="seat" />],
            Default: [<FaChair key="seat" />, <FaPlug key="plug" />]
        };
        return amenities[trainType] || amenities.Default;
    };

    if (loading) return (
    <div className="loading-spinner">
        📚 Loading catalogue...
    </div>
    );

    return (
        <div className="catalogue-container">
            <h1>Train Experiences & Amenities</h1>
            <p>Discover what makes our trains special</p>

            <div className="catalogue-grid">
                {catalogue.map(item => (
                    <div key={item.CatalogueID} className="catalogue-card">
                        <div className="catalogue-header">
                            <FaTrain className="catalogue-icon" />
                            <h3>{item.Title}</h3>
                        </div>
                        <div className="train-info">
                            <span className="train-name">{item.TrainName}</span>
                            <span className="train-number">{item.TrainNumber}</span>
                        </div>
                        <p className="description">{item.Description}</p>
                        <div className="amenities">
                            <strong>Amenities:</strong>
                            <div className="amenities-icons">
                                {getAmenities(item.TrainType || 'Express').map((amenity, index) => (
                                    <span key={index} className="amenity-icon">{amenity}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Catalogue;