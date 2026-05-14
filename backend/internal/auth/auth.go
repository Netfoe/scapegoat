package auth

import (
	"context"
	"net"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/zitadel/zitadel-go/v3/pkg/authentication"
	"github.com/zitadel/zitadel-go/v3/pkg/authentication/oidc"
	"github.com/zitadel/zitadel-go/v3/pkg/zitadel"
)

func InitAuth(ctx context.Context) (*authentication.Authenticator[*oidc.DefaultContext], error) {
	domain := os.Getenv("ZITADEL_DOMAIN")
	clientID := os.Getenv("ZITADEL_CLIENT_ID")
	encryptionKey := os.Getenv("ZITADEL_ENCRYPTION_KEY")
	if encryptionKey == "" {
		encryptionKey = "a-very-secret-string-32-chars-!!"
	}

	z := zitadel.New(domain)
	if os.Getenv("ZITADEL_INSECURE") == "true" {
		_, port, _ := net.SplitHostPort(domain)
		if port == "" {
			port = "8080"
		}
		z = zitadel.New(domain, zitadel.WithInsecure(port))
	}

	// We use DefaultAuthentication for OIDC and Bearer token support
	auth, err := authentication.New(ctx, z, encryptionKey,
		oidc.DefaultAuthentication(clientID, "", encryptionKey),
	)
	if err != nil {
		return nil, err
	}

	return auth, nil
}

func Middleware(auth *authentication.Authenticator[*oidc.DefaultContext]) gin.HandlerFunc {
	return func(c *gin.Context) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			c.Request = r
			c.Next()
		})

		// Use the Middleware helper from the authenticator
		authentication.Middleware(auth).RequireAuthentication()(next).ServeHTTP(c.Writer, c.Request)

		if !nextCalled {
			c.Abort()
		}
	}
}
