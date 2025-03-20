const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../model/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../model/place");
const User = require("../model/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pip;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlaceByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });
    console.log(places);
  } catch (err) {
    const error = new HttpError("Could not find a place for this userid.", 500);
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find a place for the provided user id.", 404)
    );
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address } = req.body;

  let coordinates = { lat: 40.7484474, lng: -73.9871516 };

  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    console.log("Failed to fetch coordinates, using default.");
    coordinates = { lat: 40.7484474, lng: -73.9871516 };
  }

  // const title = req.body.title;
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("no user", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("could not find user for provided id", 404);
    return next(error);
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const invalid = validationResult(req);
  if (!invalid.isEmpty()) {
    return next(new HttpError("Invalid input passed data", 422));
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong, cound not update", 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allow to edit this place", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("Something went wrong, cound not update", 500);
    return next(error);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError("Could not find place for provided id", 404);
    return next(error);
  }
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError("You are not allow to delete this place", 403);
    return next(error);
  }

  const imagePath = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
    await place.deleteOne();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place 2",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Deleted place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

//by using populate to get place by user id
// const getPlaceByUserId2 = async (req, res, next) => {
//   const userId = req.params.uid;
//   let places;
//   try {
//     places = await User.findById(userId).populate("places")
//   } catch (err) {
//     const error = new HttpError("Could not find a place for this userid.", 500);
//     return next(error);
//   }

//   if (!places || places.places.length === 0) {
//     return next(
//       new HttpError("Could not find a place for the provided user id.", 404)
//     );
//   }
//   res.json({
//     places: places.map((place) => place.toObject({ getters: true })),
//   });
// };
