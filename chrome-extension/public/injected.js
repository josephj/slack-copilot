(function () {
  /**
   * Generate query parameters matching Slack's format
   * @returns {URLSearchParams}
   */
  function generateQueryParams() {
    const bootData = window.boot_data || {};
    const teamId = bootData?.team_id || location.pathname.split('/')[1];

    return new URLSearchParams({
      _x_id: `${Math.random().toString(16).slice(2)}-${Date.now()}.${Math.floor(Math.random() * 1000)}`,
      _x_csid: bootData?.client_session_id || document.cookie.match(/_x_csid=([^;]+)/)?.[1] || '',
      slack_route: teamId,
      _x_version_ts: bootData?.version_ts || String(Math.floor(Date.now() / 1000)),
      _x_frontend_build_type: 'current',
      _x_desktop_ia: '4',
      _x_gantry: 'true',
      fp: '15',
      _x_num_retries: '0',
    });
  }

  async function fetchSlackUsers(token) {
    try {
      const baseUrl = new URL('/cache/T03QWUZKP/users/list', 'https://edgeapi.slack.com');
      const queryParams = generateQueryParams();
      baseUrl.search = queryParams.toString();
      baseUrl.search = queryParams.toString();

      const formData = new URLSearchParams({
        token: token,
        filter: 'everyone AND NOT bots AND NOT apps',
        count: '100',
        present_first: 'true',
      });

      const response = await fetch(baseUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return new Map(
        data.users.map(user => [
          user.id,
          {
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            title: user.profile.title,
            display_name: user.profile.display_name,
          },
        ]),
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Fetches a complete thread given channel and thread timestamp
   * @param {string} channel - Channel ID (e.g. "C0414C2HNAW")
   * @param {string} threadTs - Thread parent message timestamp (e.g. "1733882111.623399")
   * @param {string} token - Slack API token
   * @returns {Promise<Object>} Thread data
   */
  async function fetchSlackThread(channel, threadTs, token) {
    try {
      if (!token) {
        throw new Error('Could not find Slack token');
      }

      // First fetch all users
      // const userMap = await fetchSlackUsers(token);

      // Generate base URL with query parameters
      const baseUrl = new URL('/api/conversations.replies', window.location.origin);
      const queryParams = generateQueryParams();
      baseUrl.search = queryParams.toString();

      // Prepare form data
      const formData = new URLSearchParams({
        token: token,
        channel: channel,
        ts: threadTs,
        inclusive: 'true',
        limit: '100',
        _x_reason: 'channel-history-store.CFM.fetch',
        _x_mode: 'online',
        _x_sonic: 'true',
        _x_app_name: 'client',
      });

      const response = await fetch(baseUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        thread_ts: threadTs,
        channel_id: channel,
        message_count: data.messages.length,
        messages: data.messages.map(msg => ({
          id: msg.client_msg_id,
          ts: msg.ts,
          thread_ts: msg.thread_ts,
          user: msg.user,
          // user_details: userMap.get(msg.user),
          text: msg.text,
          reply_count: msg.reply_count,
          reply_users_count: msg.reply_users_count,
          latest_reply: msg.latest_reply,
          blocks: msg.blocks,
          files: msg.files,
          reactions: msg.reactions,
          edited: msg.edited,
        })),
      };
    } catch (error) {
      console.error('Error fetching thread:', error);
      throw error;
    }
  }

  // Make it available globally
  window.fetchSlackThread = fetchSlackThread;

  // Example usage in console:
  // fetchSlackThread("C0414C2HNAW", "1733882111.623399").then(console.log).catch(console.error);
})();

(function () {
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function (...args) {
    this._url = args[1];
    return originalOpen.apply(this, args);
  };

  XHR.send = function (...args) {
    const self = this;

    // Capture token from JSON data if present
    if (args[0] && typeof args[0] === 'string') {
      try {
        const jsonData = JSON.parse(args[0]);
        if (jsonData.token) {
          sessionStorage.setItem('slack-token', jsonData.token);
        }
      } catch (error) {
        // If it's not JSON, try form data as fallback
        if (args[0].includes('token=')) {
          try {
            const formData = new URLSearchParams(args[0]);
            const token = formData.get('token');
            if (token) {
              sessionStorage.setItem('slack-token', token);
            }
          } catch (formError) {
            console.error('Error extracting token from data:', formError);
          }
        }
      }
    }

    const originalOnReadyStateChange = self.onreadystatechange;

    self.onreadystatechange = function () {
      if (self.readyState === 4) {
        if (typeof self._url === 'string' && self._url.includes('/api/conversations.replies')) {
          try {
            const data = JSON.parse(self.responseText);
            window.postMessage(
              {
                type: 'SLACK_THREAD_DATA',
                url: self._url,
                data: data,
                token: sessionStorage.getItem('slack-token'),
                timestamp: new Date().toISOString(),
              },
              '*',
            );
          } catch (error) {
            console.error('Error processing XHR thread response:', error);
          }
        }
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };

    return originalSend.apply(this, args);
  };
})();

(function () {
  let lastUrl = window.location.href;

  // Watch for URL changes
  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = window.location.href;
      handleUrlChange(oldUrl, lastUrl);
    }
  }

  // Parse Slack timestamp from various URL formats
  function parseThreadTs(url) {
    const patterns = [
      /\/p(\d+)$/, // archives/messages format
      /\/(\d+\.\d+)$/, // client format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Convert p{timestamp} format to timestamp.microseconds
        const ts = match[1].replace(/^(\d{10})(\d{6})$/, '$1.$2');
        return ts;
      }
    }
    return null;
  }

  // Handle URL changes
  async function handleUrlChange(oldUrl, newUrl) {
    const threadTs = parseThreadTs(newUrl);
    if (!threadTs) return;

    // Get the token from session storage
    const token = sessionStorage.getItem('slack-token');
    if (!token) {
      console.warn('[DEBUG] No token found in session storage');
      return;
    }

    try {
      // Fetch thread data directly
      const channelId = newUrl.split('/archives/')[1]?.split('/')[0];
      if (!channelId) return;

      const response = await fetch('https://slack.com/api/conversations.replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          channel: channelId,
          ts: threadTs,
          limit: 1000, // Adjust this value based on your needs
        }),
      });

      const data = await response.json();
      if (data.ok) {
        window.postMessage(
          {
            type: 'SLACK_THREAD_DATA',
            url: newUrl,
            data: data,
            token: token,
            timestamp: new Date().toISOString(),
          },
          '*',
        );
      } else {
        console.error('[DEBUG] Failed to fetch thread:', data.error);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching thread data:', error);
    }

    // Give Slack's UI time to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to find and click the message (keeping existing UI interaction code)
    const messages = document.querySelectorAll('[data-ts]');
    for (const msg of messages) {
      if (msg.getAttribute('data-ts') === threadTs) {
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const threadButton =
          msg.querySelector('[data-qa="message_thread_button"]') || msg.querySelector('[data-qa="message_content"]');
        if (threadButton) {
          threadButton.click();
          console.log('[DEBUG] Thread opened:', threadTs);
        }
        break;
      }
    }
  }

  // Start monitoring URL changes
  const observer = new MutationObserver(checkUrlChange);
  observer.observe(document.body, { subtree: true, childList: true });

  // Also check periodically for SPA navigation
  setInterval(checkUrlChange, 1000);

  // Handle initial URL if it's a thread
  handleUrlChange('', window.location.href);

  // Expose function for manual triggering
  window.openSlackThread = async threadTs => {
    const messages = document.querySelectorAll('[data-ts]');
    for (const msg of messages) {
      if (msg.getAttribute('data-ts') === threadTs) {
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const threadButton =
          msg.querySelector('[data-qa="message_thread_button"]') || msg.querySelector('[data-qa="message_content"]');
        if (threadButton) {
          threadButton.click();
          return true;
        }
      }
    }
    return false;
  };
})();

window.addEventListener('message', async event => {
  // Verify the message origin if needed
  if (event.data.type === 'FETCH_THREAD_DATA') {
    const { channel, threadTs } = event.data.payload;
    const token = sessionStorage.getItem('slack-token');
    if (!token) {
      console.warn('[DEBUG] No token found in session storage');
      return;
    }

    const threadData = await window.fetchSlackThread(channel, threadTs, token);

    // Send the result back to the content script
    window.postMessage(
      {
        type: 'THREAD_DATA_RESULT',
        payload: threadData,
      },
      '*',
    );
  }
});
