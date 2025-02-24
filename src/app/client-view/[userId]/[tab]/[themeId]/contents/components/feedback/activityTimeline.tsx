import React from "react";
import { Box, Typography, Button } from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import { timelineItemClasses } from "@mui/lab/TimelineItem";
import TimelinePost from "./timelinePost";

class Post {
  constructor(
    public avatar: string,
    public name: string,
    public time: string,
    public content: React.ReactNode,
    public images?: string[],
    public hasConnector: boolean = true
  ) {}
}

const posts: Post[] = [
  new Post(
    "/images/users/1.jpg",
    "John Doe",
    "5 minutes ago",
    <Typography variant="subtitle1" fontSize="12px" mb={2}>
      assign a new task Design weblayout
    </Typography>,
    [
      "/images/big/img1.jpg",
      "/images/big/img2.jpg",
      "/images/big/img3.jpg",
      "/images/big/img4.jpg",
    ]
  ),
  new Post(
    "/images/users/2.jpg",
    "James Smith",
    "5 minutes ago",
    <>
      <Typography variant="subtitle1" fontSize="12px" mb={2} mt={1}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
      </Typography>
      <Button size="small" color="primary" variant="contained">
        Design Layout
      </Button>
    </>,
    ["/images/big/img4.jpg"]
  ),
  new Post(
    "/images/users/3.jpg",
    "Maria Smith",
    "5 minutes ago",
    <Typography variant="subtitle1" fontSize="12px" mb={2} mt={1}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper
    </Typography>
  ),
  new Post(
    "/images/users/4.jpg",
    "John Smith",
    "5 minutes ago",
    <Box bgcolor="primary.light" color="primary.main" fontSize="12px" p={2} mb={3}>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt
    </Box>
  ),
  new Post(
    "/images/users/5.jpg",
    "John Smith",
    "5 minutes ago",
    <Box bgcolor="secondary.light" color="secondary.main" fontSize="12px" p={2}>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt
    </Box>,
    undefined,
    false
  ),
];

const ActivityTimeline = () => {
  return (
    <Box sx={{ width: "100%", typography: "body1" }}>
      <Timeline
        sx={{
          mt: -2,
          [`& .${timelineItemClasses.root}:before`]: {
            flex: 0,
            padding: 0,
          },
        }}
      >
        {posts.map((post, index) => (
          <TimelinePost
            key={index}
            avatar={post.avatar}
            name={post.name}
            time={post.time}
            content={post.content}
            images={post.images}
            hasConnector={post.hasConnector}
          />
        ))}
      </Timeline>
    </Box>
  );
};

export default ActivityTimeline;
