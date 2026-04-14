import { Webhook } from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
  try {
    const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const payloadString = req.body.toString();
    const svixHeaders = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    const evt = webhook.verify(payloadString, svixHeaders);
    const { data, type } = evt;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          image: data.image_url,
          resume: "",
        };
        await User.create(userData);
        return res.status(200).json({ success: true });
      }
      case "user.updated": {
        const userData = {
          email: data.email_addresses[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          image: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData);
        return res.status(200).json({ success: true });
      }
      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        return res.status(200).json({ success: true });
      }
      default:
        // For unhandled types, Clerk expect a 2xx response to stop retrying
        return res.status(200).json({ success: true, message: "Unhandled event type" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Webhooks Error" });
  }
};
