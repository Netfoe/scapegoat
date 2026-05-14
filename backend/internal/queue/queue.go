package queue

import (
	"context"
	"encoding/json"
	"github.com/redis/go-redis/v9"
)

const ScanQueueKey = "scapegoat:scan:jobs"

type ScanJob struct {
	RepositoryID uint   `json:"repository_id"`
	RepoURL      string `json:"repo_url"`
}

type Client struct {
	rdb *redis.Client
}

func NewClient(url string) *Client {
	rdb := redis.NewClient(&redis.Options{
		Addr: url,
	})
	return &Client{rdb: rdb}
}

func (c *Client) PushJob(ctx context.Context, job ScanJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return c.rdb.LPush(ctx, ScanQueueKey, data).Err()
}

func (c *Client) PopJob(ctx context.Context) (*ScanJob, error) {
	result, err := c.rdb.BRPop(ctx, 0, ScanQueueKey).Result()
	if err != nil {
		return nil, err
	}

	var job ScanJob
	err = json.Unmarshal([]byte(result[1]), &job)
	if err != nil {
		return nil, err
	}
	return &job, nil
}
