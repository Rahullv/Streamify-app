import User from "../models/User.js";
import FriendRequest from "../models/FreindRequest.js";

export async function getRecommendedUsers(req, resp){
     try {
          const currentUserId = req.user.id;
          const currentUser = req.user;
          
          const recommendedUsers = await User.find({
               $and: [
                    {_id: {$ne : currentUserId }}, // exclude current user
                    {_id: {$nin: currentUser.friends }}, // exclude the current user's friends
                    {_isOnboarded: true},
               ],
          });
          resp.status(200).json(recommendedUsers);
     } catch (error) {
          console.error("Error in getRecommendedUsers controller", error.message);
          resp.status(500).json({message: "Internal Server Error"});
     }
}

export async function getMyFriends(req, resp){
     try {
          const user = await User.findById(req.user.id)
          .select("friends")
          .populate("friends", "fullName profilePic nativeLanguage learningLanguage");

          resp.status(200).json(user.friends);
     } catch (error) {
          console.error("Error in getMyFriends controller,", error.message);
          resp.status(500).json({message: "Internal Server Error"});
     }
}

export async function sendFriendRequest(req, resp){
     try {
          const myId = req.user.id;
          const { id: recipientId } = req.params;

          // prevent sending request to yourself
          if(myId == recipientId) {
               return resp.status(400).json({ message: "You can't send friend request to yourself"});
          }

          const recipient = await User.findById(recipientId);
          if(!recipient) {
               return resp.status(400).json({ message: "Recipient not found"});
          }

          // check if user is already friends
          if(recipient.friends.includes(myId)) {
               return resp.status(400).json({message : "You are already friends with this user"});
          }

          // check if a req already exists
          const existingRequest = await FriendRequest.findOne({
               $or: [
                    {sender: myId, recipient: recipientId},
                    {sender: recipientId, recipient: myId}
               ],
          });

          if(existingRequest) {
               return resp.status(400).json({message: "A friend request already exists between you and this user"});
          }

          // New Request
          const friendRequest = await FriendRequest.create({
               sender: myId,
               recipient: recipientId,
          })

          resp.status(200).json(friendRequest);
     } catch (error) {
          console.log("Error in sendFriendRequest controller", error.message);
          resp.status(500).json({message: "Internal Server Error"});
     }
}

export async function acceptFriendRequest(req, res) {
     try {
          const {id: requestId } = req.params;
          const friendRequest = await friendRequest.findById(requestId);

          if(!friendRequest) {
               return res.status(400).json({ message: "Friend request not found"});
          }

          // Verify the current user is the recipient
          if(friendRequest.recipient.toString() !== req.user.id ){
               return res.status(403).json({message : "You are not authorized to accept this request"})
          }

          friendRequest.status = "accepted";
          await friendRequest.save();

          // add each user to the other's friend request array
          // addToSet: adds elements to an array only if they do not already exist.
          await User.findByIdAndUpdate(friendRequest.sender, {
               $addToSet: {friends: friendRequest.recipient },
          });

          await User.findByIdAndUpdate(friendRequest.recipient, {
               $addToSet: {friends: friendRequest.sender },
          });

          res.status(200).json({message: "Friend request accepted"});

     } catch (error) {
          console.log("Error in acceptFriendRequest controller", error.message);
          res.status(500).json({message: "Internal server error"})
     }
}