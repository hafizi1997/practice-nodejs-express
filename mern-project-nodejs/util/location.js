const API_KEY = "SDAVDASUTYSVFTQJHDAVADVDAVFWHB";
const axios = require("axios");
const HttpError = require("../model/http-error");

async function getCoordsForAddress(address) {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${API_KEY}`
    );
    const data = response.data;

    if (!data || data.status === "ZERO_RESULTS") {
      throw new HttpError("Could not find location for the specified address.", 422);
    }

    const coordinates = data.results[0].geometry.location;
    return coordinates;
  } catch (error) {
    throw new HttpError("Failed to fetch coordinates. Please try again later.", 500);
  }
}

module.exports = getCoordsForAddress;
