import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';
import { marked } from 'marked';

const MessageBubble = ({ message, isUser, timestamp }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: '70%',
          backgroundColor: isUser ? 'primary.main' : 'grey.100',
          color: isUser ? 'white' : 'text.primary',
          borderRadius: isUser
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          position: 'relative',
          textAlign: isUser ? 'right' : 'left',
          ml: isUser ? 'auto' : 0,
          mr: isUser ? 0 : 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            [isUser ? 'right' : 'left']: -8,
            transform: 'translateY(-50%)',
            borderStyle: 'solid',
            borderWidth: '8px 0 8px 8px',
            borderColor: isUser
              ? 'transparent transparent transparent #2563eb'
              : 'transparent transparent transparent #f3f6f9',
            [isUser ? 'borderRight' : 'borderLeft']: 'none',
          },
        }}
      >
        <Typography
          variant="body1"
          sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: isUser ? 'right' : 'left' }}
          dangerouslySetInnerHTML={{ __html: marked.parse(message) }}
        />
        {timestamp && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              opacity: 0.7,
              fontSize: '0.75rem',
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {format(new Date(timestamp), 'h:mm a')}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble;
